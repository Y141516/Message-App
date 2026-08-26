export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage, TelegramMessages } from '@/lib/telegram';

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

    // Regular message: check queue
    let bypassedClosedQueue = false;
    if (!is_emergency) {
      const { data: queue } = await supabaseAdmin
        .from('queues')
        .select('id, is_open, message_limit, messages_received')
        .eq('leader_id', leader_id).eq('is_open', true).single();

      if (!queue) {
        // No open queue right now. Always-open group members (e.g.
        // Foreigners) can still send — everyone else is blocked as before.
        if (!isAlwaysOpenMember) {
          return NextResponse.json({ error: 'Queue is closed' }, { status: 400 });
        }
        bypassedClosedQueue = true;
      } else {
        if (queue.messages_received >= queue.message_limit)
          return NextResponse.json({ error: 'Queue limit reached' }, { status: 400 });

        // While a queue IS actively open, everyone — including always-open
        // group members — is still limited to one message per session. This
        // keeps things fair during a live queue; the always-open exemption
        // only kicks in once the queue has closed.
        const { data: existing } = await supabaseAdmin
          .from('messages').select('id')
          .eq('sender_id', user.id).eq('queue_id', queue.id).single();
        if (existing)
          return NextResponse.json({ error: 'already_sent', message: 'You already sent a message in this queue.' }, { status: 400 });
      }
    }

    // Get queue_id
    let queue_id: string | null = null;
    if (!is_emergency && !bypassedClosedQueue) {
      const { data: q } = await supabaseAdmin
        .from('queues').select('id').eq('leader_id', leader_id).eq('is_open', true).single();
      queue_id = q?.id || null;
    }

    // Upload media
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

    // Upload voice note
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

    // Insert message — triggers Realtime instantly on leader's screen
    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: user.id,
        leader_id,
        queue_id,
        content: content?.trim() || null,
        message_type,
        media_url,
        media_type: media_type || null,
        user_voice_url,
        is_emergency,
        is_replied: false,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Notify leader of emergency with HTML formatting
    if (is_emergency) {
      void (async () => {
        try {
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
        } catch {}
      })();
    }

    // Check queue auto-close
    if (queue_id) {
      void (async () => {
        try {
          const { data: uq } = await supabaseAdmin
            .from('queues')
            .select('is_open, messages_received, message_limit, leaders(display_name, users(telegram_id))')
            .eq('id', queue_id!).single();

          if (uq && !uq.is_open) {
            const leaderTgId = (uq.leaders as any)?.users?.telegram_id;
            const leaderName = (uq.leaders as any)?.display_name;
            if (leaderTgId) {
              await sendTelegramMessage(leaderTgId,
                TelegramMessages.queueAutoClose(uq.message_limit, uq.messages_received));
            }
            const { data: allUsers } = await supabaseAdmin
              .from('users').select('telegram_id').eq('role', 'user').eq('is_active', true);
            if (allUsers?.length && leaderName) {
              const msg = TelegramMessages.userNotInQueue(leaderName);
              for (let i = 0; i < allUsers.length; i += 25) {
                void Promise.allSettled(allUsers.slice(i, i + 25).map((u: any) => sendTelegramMessage(u.telegram_id, msg)));
                if (i + 25 < allUsers.length) await new Promise(r => setTimeout(r, 1000));
              }
            }
          }
        } catch {}
      })();
    }

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}
