export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/users/clear-data
// mode: 'messages_only' — deletes messages/files/voice recordings, keeps the account
// mode: 'full'          — for USERS: deletes the account entirely, next login goes
//                          through onboarding again (isNewUser flow).
//                          for LEADERS: cannot safely delete the account — other
//                          users' messages/replies reference leaders with
//                          ON DELETE RESTRICT, so deleting the row would either
//                          fail outright or force-delete other people's message
//                          history. Instead this resets the leader's own profile
//                          fields and deletes their own authored replies, but
//                          keeps the account active.
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, mode } = await req.json();
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    if (mode !== 'messages_only' && mode !== 'full') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // ── 1. Messages this account SENT ──
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, media_url, user_voice_url')
      .eq('sender_id', user.id);

    const messageIds = (messages || []).map(m => m.id);

    // ── 2. Delete replies TO those messages + their audio files ──
    if (messageIds.length > 0) {
      const { data: repliesToOwnMsgs } = await supabaseAdmin
        .from('replies')
        .select('id, audio_url')
        .in('message_id', messageIds);

      const replyAudioPaths = (repliesToOwnMsgs || [])
        .filter(r => r.audio_url)
        .map(r => extractStoragePath(r.audio_url));
      if (replyAudioPaths.length > 0) {
        await supabaseAdmin.storage.from('reply-audio').remove(replyAudioPaths);
      }

      await supabaseAdmin.from('replies').delete().in('message_id', messageIds);
    }

    // ── 3. Delete this account's own media/voice files from storage ──
    const mediaUrls = (messages || []).filter(m => m.media_url).map(m => extractStoragePath(m.media_url!));
    const voiceUrls = (messages || []).filter(m => m.user_voice_url).map(m => extractStoragePath(m.user_voice_url!));
    if (mediaUrls.length > 0) await supabaseAdmin.storage.from('message-media').remove(mediaUrls);
    if (voiceUrls.length > 0) await supabaseAdmin.storage.from('message-media').remove(voiceUrls);

    // ── 4. Delete this account's own messages ──
    if (messageIds.length > 0) {
      await supabaseAdmin.from('messages').delete().eq('sender_id', user.id);
    }

    // ── 5. Delete emergency daily-count records, dismissals, notifications ──
    await supabaseAdmin.from('emergency_daily_counts').delete().eq('user_id', user.id);
    await supabaseAdmin.from('announcement_dismissals').delete().eq('user_id', user.id);
    await supabaseAdmin.from('notifications').delete().eq('user_id', user.id);

    // ── 6. Leader-specific cleanup ──
    let leaderRowId: string | null = null;
    if (user.role === 'leader') {
      const { data: leaderRow } = await supabaseAdmin
        .from('leaders')
        .select('id')
        .eq('user_id', user.id)
        .single();
      leaderRowId = leaderRow?.id || null;

      if (leaderRowId) {
        // BUG FIX: this previously compared queues.leader_id (a leaders.id)
        // against user.id (a users.id) — those are different UUIDs, so the
        // delete silently matched zero rows every time. Use the correct id.
        await supabaseAdmin.from('queues').delete().eq('leader_id', leaderRowId).eq('is_open', false);
      }
    }

    if (mode === 'full') {
      if (user.role === 'leader' && leaderRowId) {
        // Delete replies this leader has authored to OTHER users' messages.
        // This is a real, visible loss for those recipients, but "full reset"
        // is an explicit nuclear option — we don't silently keep data behind
        // after the leader asks to wipe everything they own.
        const { data: ownReplies } = await supabaseAdmin
          .from('replies')
          .select('id, message_id, audio_url')
          .eq('leader_id', leaderRowId);

        const ownReplyAudioPaths = (ownReplies || [])
          .filter(r => r.audio_url)
          .map(r => extractStoragePath(r.audio_url));
        if (ownReplyAudioPaths.length > 0) {
          await supabaseAdmin.storage.from('reply-audio').remove(ownReplyAudioPaths);
        }

        const repliedMessageIds = (ownReplies || []).map(r => r.message_id).filter(Boolean);
        await supabaseAdmin.from('replies').delete().eq('leader_id', leaderRowId);

        // Those messages are no longer actually replied — clear the flag so
        // they don't get stuck showing "replied" with no reply behind them.
        if (repliedMessageIds.length > 0) {
          await supabaseAdmin.from('messages').update({ is_replied: false }).in('id', repliedMessageIds);
        }

        // Reset the leader's own display fields.
        await supabaseAdmin.from('leaders').update({ display_name: 'Leader', avatar_url: null }).eq('id', leaderRowId);
      }

      if (user.role === 'leader') {
        // Leaders keep their account (see doc comment above) — just reset
        // the shared profile fields on the users row.
        await supabaseAdmin
          .from('users')
          .update({ name: 'Leader', city: '', phone: null })
          .eq('id', user.id);

        return NextResponse.json({
          success: true,
          mode,
          accountDeleted: false,
          note: 'Profile reset. Your leader account stays active because other members\u2019 messages still reference it.',
        });
      }

      // Regular users: fully delete the account. All FK-referencing rows
      // (user_groups, notifications, announcement_dismissals) cascade
      // automatically; messages were already cleared above so the
      // ON DELETE RESTRICT on messages.sender_id won't block this.
      await supabaseAdmin.from('users').delete().eq('id', user.id);

      return NextResponse.json({ success: true, mode, accountDeleted: true });
    }

    // mode === 'messages_only'
    return NextResponse.json({ success: true, mode, accountDeleted: false });
  } catch (err: any) {
    console.error('Clear data error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

function extractStoragePath(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/object/public/');
    if (parts.length > 1) {
      const withBucket = parts[1];
      const slashIndex = withBucket.indexOf('/');
      return slashIndex > -1 ? withBucket.slice(slashIndex + 1) : withBucket;
    }
  } catch {}
  return url;
}
