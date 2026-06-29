export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/users/clear-data
// Deletes all messages, files, voice recordings for a user
// Keeps: account, name, city, groups (option 1) OR also wipes those (option 2)
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, mode } = await req.json();
    // mode: 'messages_only' = keep account | 'full' = wipe everything incl name/city

    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // ── 1. Get all message IDs for this user ──
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, media_url, user_voice_url, queue_id')
      .eq('sender_id', user.id);

    const messageIds = (messages || []).map(m => m.id);

    // ── 2. Delete replies to user's messages ──
    if (messageIds.length > 0) {
      // Get audio URLs from replies before deleting
      const { data: replies } = await supabaseAdmin
        .from('replies')
        .select('id, audio_url')
        .in('message_id', messageIds);

      // Delete reply audio files from storage
      const replyAudioPaths = (replies || [])
        .filter(r => r.audio_url)
        .map(r => extractStoragePath(r.audio_url));
      if (replyAudioPaths.length > 0) {
        await supabaseAdmin.storage.from('reply-audio').remove(replyAudioPaths);
      }

      // Delete replies
      await supabaseAdmin.from('replies').delete().in('message_id', messageIds);
    }

    // ── 3. Delete media files from storage ──
    const mediaUrls = (messages || []).filter(m => m.media_url).map(m => extractStoragePath(m.media_url));
    const voiceUrls = (messages || []).filter(m => m.user_voice_url).map(m => extractStoragePath(m.user_voice_url));

    if (mediaUrls.length > 0) {
      await supabaseAdmin.storage.from('message-media').remove(mediaUrls);
    }
    if (voiceUrls.length > 0) {
      await supabaseAdmin.storage.from('message-media').remove(voiceUrls);
    }

    // ── 4. Delete all messages ──
    await supabaseAdmin.from('messages').delete().eq('sender_id', user.id);

    // ── 5. Delete emergency count records ──
    await supabaseAdmin.from('emergency_daily_counts').delete().eq('user_id', user.id);

    // ── 6. Delete announcement dismissals ──
    await supabaseAdmin.from('announcement_dismissals').delete().eq('user_id', user.id);

    // ── 7. Delete notifications ──
    await supabaseAdmin.from('notifications').delete().eq('user_id', user.id);

    if (user.role === 'leader') {
      // Leaders: clear queue history but keep replies (they stay for users)
      await supabaseAdmin.from('queues').delete().eq('leader_id', user.id).eq('is_open', false);
    }

    // ── 8. If full wipe — reset name/city, keep account structure ──
    if (mode === 'full') {
      await supabaseAdmin
        .from('users')
        .update({
          name: 'User',
          city: '',
          phone: null,
          onboarding_complete: false,
        })
        .eq('id', user.id);
    }

    return NextResponse.json({ success: true, mode });
  } catch (err: any) {
    console.error('Clear data error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// Extract storage path from a full Supabase public URL
function extractStoragePath(url: string): string {
  try {
    const parsed = new URL(url);
    // URL format: .../storage/v1/object/public/{bucket}/{path}
    const parts = parsed.pathname.split('/object/public/');
    if (parts.length > 1) {
      const withBucket = parts[1];
      const slashIndex = withBucket.indexOf('/');
      return slashIndex > -1 ? withBucket.slice(slashIndex + 1) : withBucket;
    }
  } catch {}
  return url;
}
