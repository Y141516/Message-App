export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage, broadcastToTelegramUsers, TelegramMessages } from '@/lib/telegram';
import { runInBackground } from '@/lib/backgroundTask';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const telegram_id  = formData.get('telegram_id') as string;
    const leader_id    = formData.get('leader_id') as string;
    const content      = formData.get('content') as string;
    const message_type = (formData.get('message_type') as string) || 'regular';
    const is_emergency = formData.get('is_emergency') === 'true';
    const media_file   = formData.get('media') as File | null;
    const media_type   = formData.get('media_type') as string | null;
    const voice_file   = formData.get('voice') as File | null;

    if (!telegram_id || !leader_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from('users').select('id, name').eq('telegram_id', telegram_id).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Does this sender belong to a group that's allowed to send anytime,
    // even when the leader's queue is currently closed? (e.g. "Foreigners")
    let isAlwaysOpenMember = false;
    if (!is_emergency) {
      const { data: memberGroups } = await supabaseAdmin
        .from('user_groups')
        .select('groups(always_open)')
        .eq('user_id', user.id);
      isAlwaysOpenMember = (memberGroups || []).some((ug: any) => ug.groups?.always_open === true);
    }

    // Upload media BEFORE the atomic insert step — storage uploads aren't
    // part of the DB transaction, so we want them done first and just pass
    // the resulting URLs in.
    let media_url: string | null = null;
    if (media_file && media_file.size > 0) {
      const bytes = await media_file.arrayBuffer();
      const ext = media_file.name.split('.').pop() || 'bin';
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const { data: up } = await supabaseAdmin.storage.from('message-media')
        .upload(fileName, Buffer.from(bytes), { contentType: media_file.type, upsert: false });
      if (up) {
        const { data: urlData } = supabaseAdmin.storage.from('message-media').getPublicUrl(fileName);
        media_url = urlData.publicUrl;
      }
    }

    let user_voice_url: string | null = null;
    if (voice_file && voice_file.size > 0) {
      const bytes = await voice_file.arrayBuffer();
      const ext = voice_file.name.split('.').pop() || 'webm';
      const fileName = `${user.id}/voice-${Date.now()}.${ext}`;
      const { data: up } = await supabaseAdmin.storage.from('message-media')
        .upload(fileName, Buffer.from(bytes), { contentType: voice_file.type || 'audio/webm', upsert: false });
      if (up) {
        const { data: urlData } = supabaseAdmin.storage.from('message-media').getPublicUrl(fileName);
        user_voice_url = urlData.publicUrl;
      }
    }

    // HEAVY-LOAD FIX: the queue-open check, message-limit check, duplicate
    // check, and the actual insert now all happen atomically inside one
    // Postgres function (see MIGRATION_V4.sql) using SELECT ... FOR UPDATE
    // to lock the queue row. Previously these were separate read-then-write
    // steps in application code — under heavy concurrent traffic (e.g. a
    // queue opening to hundreds of people at once), many requests could all
    // pass the "is there room?" check at nearly the same instant, before any
    // of their inserts landed, letting the queue overshoot its limit and
    // occasionally letting the same sender in twice. Locking the row makes
    // concurrent submissions for the same leader safely queue up instead of
    // racing — each one resolves in milliseconds, so this stays fast even
    // under a traffic spike.
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('submit_message', {
      p_sender_id: user.id,
      p_leader_id: leader_id,
      p_content: content?.trim() || null,
      p_message_type: message_type,
      p_media_url: media_url,
      p_media_type: media_type || null,
      p_user_voice_url: user_voice_url,
      p_is_emergency: is_emergency,
      p_is_always_open_member: isAlwaysOpenMember,
    });

    if (rpcError) throw rpcError;

    const result = rpcResult as { message_id: string | null; queue_id: string | null; error: string | null };

    if (result.error === 'queue_closed') {
      return NextResponse.json({ error: 'Queue is closed' }, { status: 400 });
    }
    if (result.error === 'queue_limit_reached') {
      return NextResponse.json({ error: 'Queue limit reached' }, { status: 400 });
    }
    if (result.error === 'already_sent') {
      return NextResponse.json({ error: 'already_sent', message: 'You already sent a message in this queue.' }, { status: 400 });
    }
    if (!result.message_id) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    const { data: message } = await supabaseAdmin
      .from('messages').select('*').eq('id', result.message_id).single();

    const queue_id = result.queue_id;

    // Notify leader of emergency with HTML formatting — kept alive after
    // the response via runInBackground (see lib/backgroundTask.ts).
    if (is_emergency) {
      runInBackground(async () => {
        const { data: leaderData } = await supabaseAdmin
          .from('leaders').select('display_name, users(telegram_id)').eq('id', leader_id).single();
        if (leaderData?.users) {
          const labels: Record<string, string> = {
            emergency_medical:   '🏥 <b>MEDICAL EMERGENCY</b>',
            emergency_transport: '🚗 <b>TRANSPORT EMERGENCY</b>',
            emergency_urgent:    '🚨 <b>URGENT EMERGENCY</b>',
          };
          await sendTelegramMessage(
            (leaderData.users as any).telegram_id,
            TelegramMessages.emergencyReceived(
              labels[message_type] || '🚨 <b>EMERGENCY</b>',
              user.name,
              content,
              !!user_voice_url
            )
          );
        }
      });
    }

    // Check queue auto-close and notify everyone who missed it.
    //
    // BUG FIX: this used to run unconditionally on EVERY message that landed
    // after the queue closed. Under heavy concurrent traffic, many requests
    // can land in the moments right around the queue hitting its limit —
    // each one would independently see "queue just closed" and each kick
    // off its own full broadcast to every single user, multiplying an
    // already-expensive mass-notification job. `auto_close_notified` lets
    // exactly ONE request claim this job, atomically, via a conditional
    // UPDATE — everyone else's UPDATE simply matches zero rows and they
    // correctly do nothing.
    if (queue_id) {
      runInBackground(async () => {
        const { data: claimed } = await supabaseAdmin
          .from('queues')
          .update({ auto_close_notified: true })
          .eq('id', queue_id)
          .eq('is_open', false)
          .eq('auto_close_notified', false)
          .select('id, messages_received, message_limit, leaders(display_name, users(telegram_id))')
          .single();

        if (!claimed) return; // queue still open, or another request already claimed this

        const leaderTgId = (claimed.leaders as any)?.users?.telegram_id;
        const leaderName = (claimed.leaders as any)?.display_name;

        if (leaderTgId) {
          await sendTelegramMessage(leaderTgId,
            TelegramMessages.queueAutoClose(claimed.message_limit, claimed.messages_received));
        }

        if (leaderName) {
          const { data: allUsers } = await supabaseAdmin
            .from('users').select('telegram_id').eq('role', 'user').eq('is_active', true);
          if (allUsers?.length) {
            await broadcastToTelegramUsers(allUsers.map(u => u.telegram_id), TelegramMessages.userNotInQueue(leaderName));
          }
        }
      });
    }

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}
