export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

// POST /api/leader/reply — submit a reply (text or audio)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const telegram_id = formData.get('telegram_id') as string;
    const message_id = formData.get('message_id') as string;
    const reply_type = formData.get('reply_type') as string;
    const content = formData.get('content') as string;
    const audio_file = formData.get('audio') as File | null;

    if (!telegram_id || !message_id || !reply_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify leader
    const { data: leader } = await supabaseAdmin
      .from('leaders')
      .select('id, display_name, users!inner(telegram_id)')
      .eq('users.telegram_id', telegram_id)
      .single();

    if (!leader) return NextResponse.json({ error: 'Not a leader' }, { status: 403 });

    // Get message + sender info for notification
    const { data: message } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, is_replied, users(telegram_id, name)')
      .eq('id', message_id)
      .eq('leader_id', leader.id)
      .single();

    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    if (message.is_replied) return NextResponse.json({ error: 'Already replied' }, { status: 400 });

    let audio_url: string | null = null;

    // Upload audio if present
    if (reply_type === 'audio' && audio_file && audio_file.size > 0) {
      const bytes = await audio_file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = audio_file.name.split('.').pop() || 'webm';
      const fileName = `${leader.id}/${message_id}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('reply-audio')
        .upload(fileName, buffer, {
          contentType: audio_file.type || 'audio/webm',
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabaseAdmin.storage
          .from('reply-audio')
          .getPublicUrl(fileName);
        audio_url = urlData.publicUrl;
      }
    }

    if (reply_type === 'text' && !content?.trim()) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }
    if (reply_type === 'audio' && !audio_url) {
      return NextResponse.json({ error: 'Audio upload failed' }, { status: 400 });
    }

    // Insert reply
    const { data: reply, error: replyError } = await supabaseAdmin
      .from('replies')
      .insert({
        message_id,
        leader_id: leader.id,
        content: reply_type === 'text' ? content.trim() : null,
        audio_url,
        reply_type,
      })
      .select()
      .single();

    if (replyError) throw replyError;

    // Notify user via Telegram bot
    try {
      const senderTelegramId = (message.users as any)?.telegram_id;
      if (senderTelegramId) {
        let notifText: string;
        if (reply_type === 'audio') {
          notifText = `🔔 *Reply Received!*\n\nYou have received an *audio reply* from ${leader.display_name} ji.\n\nOpen the app to listen. 🙏`;
        } else {
          const preview = (content || '').slice(0, 120);
          const truncated = (content || '').length > 120 ? '...' : '';
          notifText = `🔔 *Reply Received!*\n\nYou have received a reply from ${leader.display_name} ji:\n\n"${preview}${truncated}"\n\nOpen the app to view. 🙏`;
        }
        await sendTelegramMessage(senderTelegramId, notifText);
      }
    } catch {
      // Notification failure is non-critical
    }

    return NextResponse.json({ success: true, reply });
  } catch (err) {
    console.error('Reply error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
