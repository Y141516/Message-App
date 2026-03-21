export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

// POST /api/messages — send a new message
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const telegram_id = formData.get('telegram_id') as string;
    const leader_id = formData.get('leader_id') as string;
    const content = formData.get('content') as string;
    const message_type = (formData.get('message_type') as string) || 'regular';
    const is_emergency = formData.get('is_emergency') === 'true';
    const media_file = formData.get('media') as File | null;
    const media_type = formData.get('media_type') as string | null;

    if (!telegram_id || !leader_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('telegram_id', telegram_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Emergency limit check
    if (is_emergency) {
      const today = new Date().toISOString().split('T')[0];
      const { data: emergencyCount } = await supabaseAdmin
        .from('emergency_daily_counts')
        .select('count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (emergencyCount && emergencyCount.count >= 3) {
        return NextResponse.json({
          error: 'limit_reached',
          message: 'You have reached the maximum of 3 emergency messages today.',
        }, { status: 429 });
      }
    } else {
      // Regular message: check queue is open and user hasn't already sent
      const { data: queue } = await supabaseAdmin
        .from('queues')
        .select('id, is_open, message_limit, messages_received')
        .eq('leader_id', leader_id)
        .eq('is_open', true)
        .single();

      if (!queue) {
        return NextResponse.json({ error: 'Queue is closed' }, { status: 400 });
      }

      if (queue.messages_received >= queue.message_limit) {
        return NextResponse.json({ error: 'Queue limit reached' }, { status: 400 });
      }

      // Check if user already sent in this queue
      const { data: existingMsg } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('sender_id', user.id)
        .eq('queue_id', queue.id)
        .single();

      if (existingMsg) {
        return NextResponse.json({
          error: 'already_sent',
          message: 'You have already sent a message in this queue.',
        }, { status: 400 });
      }
    }

    // Get active queue id for regular messages
    let queue_id = null;
    if (!is_emergency) {
      const { data: queue } = await supabaseAdmin
        .from('queues')
        .select('id')
        .eq('leader_id', leader_id)
        .eq('is_open', true)
        .single();
      queue_id = queue?.id || null;
    }

    // Upload media if present
    let media_url = null;
    let final_media_type = media_type;

    if (media_file && media_file.size > 0) {
      const bytes = await media_file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = media_file.name.split('.').pop() || 'bin';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('message-media')
        .upload(fileName, buffer, {
          contentType: media_file.type,
          upsert: false,
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabaseAdmin.storage
          .from('message-media')
          .getPublicUrl(fileName);
        media_url = urlData.publicUrl;
      }
    }

    // Insert message
    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: user.id,
        leader_id,
        queue_id,
        content: content || null,
        message_type,
        media_url,
        media_type: final_media_type || null,
        is_emergency,
        is_replied: false,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update emergency count
    if (is_emergency) {
      const today = new Date().toISOString().split('T')[0];
      try {
        await supabaseAdmin.rpc('increment_emergency_count', {
          p_user_id: user.id,
          p_date: today,
        });
      } catch {
        // Fallback upsert if RPC not yet created
        await supabaseAdmin.from('emergency_daily_counts').upsert({
          user_id: user.id,
          date: today,
          count: 1,
        }, { onConflict: 'user_id,date' });
      }
    }

    // Notify leader via Telegram bot
    try {
      const { data: leaderData } = await supabaseAdmin
        .from('leaders')
        .select('display_name, users(telegram_id)')
        .eq('id', leader_id)
        .single();

      if (leaderData?.users) {
        const leaderTelegramId = (leaderData.users as any).telegram_id;
        if (is_emergency) {
          // Always notify leader of emergency messages
          const emergencyLabels: Record<string, string> = {
            emergency_medical: '🏥 MEDICAL EMERGENCY',
            emergency_transport: '🚗 TRANSPORT EMERGENCY',
            emergency_urgent: '🚨 URGENT EMERGENCY',
          };
          const label = emergencyLabels[message_type] || '🚨 EMERGENCY';
          await sendTelegramMessage(
            leaderTelegramId,
            `${label}\n\nFrom: ${user.name}\n${content ? `"${content.slice(0, 150)}"` : '[Media attached]'}\n\nOpen the app to reply immediately.`
          );
        }
      }
    } catch {
      // Notification failure is non-critical
    }

    // Check if queue auto-closed after this message
    if (queue_id) {
      try {
        const { data: updatedQueue } = await supabaseAdmin
          .from('queues')
          .select('is_open, messages_received, message_limit, leaders(display_name, users(telegram_id))')
          .eq('id', queue_id)
          .single();

        if (updatedQueue && !updatedQueue.is_open) {
          // Queue just auto-closed — notify leader
          const leaderTelegramId = (updatedQueue.leaders as any)?.users?.telegram_id;
          const leaderName = (updatedQueue.leaders as any)?.display_name;
          if (leaderTelegramId) {
            void sendTelegramMessage(
              leaderTelegramId,
              `✅ *Queue Auto-Closed*\n\nYour queue has reached the limit of *${updatedQueue.message_limit}* messages.\n\nTotal received: ${updatedQueue.messages_received}\n\nOpen the app to start replying. 🙏`
            );
          }
          // Notify users queue is now closed
          const { data: allUsers } = await supabaseAdmin
            .from('users').select('telegram_id').eq('role', 'user').eq('is_active', true);
          if (allUsers?.length) {
            const msg = `🔴 *Queue Closed*\n\n${leaderName} ji's queue is now full and has closed automatically.\n\nYou will receive a reply soon. 🙏`;
            const batchSize = 25;
            for (let i = 0; i < allUsers.length; i += batchSize) {
              const batch = allUsers.slice(i, i + batchSize);
              void Promise.allSettled(batch.map((u: any) => sendTelegramMessage(u.telegram_id, msg)));
              if (i + batchSize < allUsers.length) await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
