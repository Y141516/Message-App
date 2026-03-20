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
      const { data: leader } = await supabaseAdmin
        .from('leaders')
        .select('display_name, users(telegram_id)')
        .eq('id', leader_id)
        .single();

      if (leader?.users) {
        const leaderTelegramId = (leader.users as any).telegram_id;
        const msgTypeLabel = is_emergency ? '🚨 EMERGENCY' : '📩 New Message';
        await sendTelegramMessage(
          leaderTelegramId,
          `${msgTypeLabel} from ${user.name}\n\n${content ? `"${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"` : '[Media attached]'}`
        );
      }
    } catch {
      // Notification failure is non-critical
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
