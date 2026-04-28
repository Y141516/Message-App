export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const telegram_id = formData.get('telegram_id') as string;
    const leader_id   = formData.get('leader_id') as string;
    const content     = formData.get('content') as string;
    const message_type = (formData.get('message_type') as string) || 'regular';
    const is_emergency = formData.get('is_emergency') === 'true';
    const media_file  = formData.get('media') as File | null;
    const media_type  = formData.get('media_type') as string | null;
    const voice_file  = formData.get('voice') as File | null;

    if (!telegram_id || !leader_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users').select('id, name').eq('telegram_id', telegram_id).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Emergency limit check
    if (is_emergency) {
      const today = new Date().toISOString().split('T')[0];
      const { data: ec } = await supabaseAdmin
        .from('emergency_daily_counts').select('count')
        .eq('user_id', user.id).eq('date', today).single();
      if (ec && ec.count >= 3) {
        return NextResponse.json({ error: 'limit_reached', message: 'Max 3 emergency messages per day.' }, { status: 429 });
      }
    } else {
      // Check queue open + user hasn't sent in this queue
      const { data: queue } = await supabaseAdmin
        .from('queues').select('id, is_open, message_limit, messages_received')
        .eq('leader_id', leader_id).eq('is_open', true).single();
      if (!queue) return NextResponse.json({ error: 'Queue is closed' }, { status: 400 });
      if (queue.messages_received >= queue.message_limit)
        return NextResponse.json({ error: 'Queue limit reached' }, { status: 400 });

      const { data: existingMsg } = await supabaseAdmin
        .from('messages').select('id')
        .eq('sender_id', user.id).eq('queue_id', queue.id).single();
      if (existingMsg) return NextResponse.json({ error: 'already_sent' }, { status: 400 });
    }

    // Get queue_id for regular messages
    let queue_id: string | null = null;
    if (!is_emergency) {
      const { data: q } = await supabaseAdmin
        .from('queues').select('id').eq('leader_id', leader_id).eq('is_open', true).single();
      queue_id = q?.id || null;
    }

    // Upload main media if present
    let media_url: string | null = null;
    let final_media_type = media_type;
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

    // Upload voice note if present
    let voice_url: string | null = null;
    if (voice_file && voice_file.size > 0) {
      const bytes = await voice_file.arrayBuffer();
      const ext = voice_file.name.split('.').pop() || 'webm';
      const fileName = `${user.id}/voice-${Date.now()}.${ext}`;
      const { data: up } = await supabaseAdmin.storage.from('message-media')
        .upload(fileName, Buffer.from(bytes), { contentType: voice_file.type || 'audio/webm', upsert: false });
      if (up) {
        const { data: urlData } = supabaseAdmin.storage.from('message-media').getPublicUrl(fileName);
        voice_url = urlData.publicUrl;
      }
    }

    // Insert message — this triggers Realtime on the leader's screen instantly
    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: user.id,
        leader_id,
        queue_id,
        content: content?.trim() || null,
        message_type,
        media_url,
        media_type: final_media_type || null,
        voice_url,   // new column for mandatory voice note
        is_emergency,
        is_replied: false,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Emergency count update
    if (is_emergency) {
      const today = new Date().toISOString().split('T')[0];
      try {
        await supabaseAdmin.rpc('increment_emergency_count', { p_user_id: user.id, p_date: today });
      } catch {
        await supabaseAdmin.from('emergency_daily_counts').upsert(
          { user_id: user.id, date: today, count: 1 },
          { onConflict: 'user_id,date' }
        );
      }
    }

    // Notify leader of emergency (non-critical)
    if (is_emergency) {
      void (async () => {
        try {
          const { data: leaderData } = await supabaseAdmin
            .from('leaders').select('display_name, users(telegram_id)').eq('id', leader_id).single();
          if (leaderData?.users) {
            const labels: Record<string, string> = {
              emergency_medical:   '🏥 MEDICAL EMERGENCY',
              emergency_transport: '🚗 TRANSPORT EMERGENCY',
              emergency_urgent:    '🚨 URGENT EMERGENCY',
            };
            await sendTelegramMessage(
              (leaderData.users as any).telegram_id,
              `${labels[message_type] || '🚨 EMERGENCY'}\n\nFrom: ${user.name}\n${content ? `"${content.slice(0, 150)}"` : ''}\n${voice_url ? '🎤 Voice note attached' : ''}\n\nOpen the app to reply immediately.`
            );
          }
        } catch {}
      })();
    }

    // Check auto-close after queue message
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
                `✅ *Queue Auto-Closed*\n\nYour queue reached the limit of *${uq.message_limit}* messages.\n\nTotal received: ${uq.messages_received}\n\nOpen the app to start replying. 🙏`);
            }
            const { data: allUsers } = await supabaseAdmin.from('users').select('telegram_id').eq('role', 'user').eq('is_active', true);
            if (allUsers?.length) {
              const msg = `🔴 *Queue Closed*\n\n${leaderName} ji's queue is now full.\n\nYou will receive a reply soon. 🙏`;
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
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
