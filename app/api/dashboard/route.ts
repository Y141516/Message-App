export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/dashboard?telegram_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');

    if (!telegram_id) {
      return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Step 1: Fetch all messages for this user with leader info
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        content,
        message_type,
        media_url,
        media_type,
        is_emergency,
        is_replied,
        created_at,
        leader_id,
        leaders(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (msgError) throw msgError;

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        currentMessage: null,
        messages: [],
        unreplied: [],
        replied: [],
      });
    }

    // Step 2: Fetch replies for all these messages separately
    const messageIds = messages.map(m => m.id);
    const { data: replies, error: replyError } = await supabaseAdmin
      .from('replies')
      .select(`
        id,
        message_id,
        content,
        audio_url,
        reply_type,
        created_at
      `)
      .in('message_id', messageIds);

    if (replyError) throw replyError;

    // Step 3: Build a map of message_id → reply
    const replyMap = new Map((replies || []).map(r => [r.message_id, r]));

    // Step 4: Merge replies into messages
    const enriched = messages.map(m => ({
      ...m,
      replies: replyMap.get(m.id) ? [replyMap.get(m.id)] : [],
    }));

    const unreplied = enriched.filter(m => !m.is_replied);
    const replied = enriched.filter(m => m.is_replied);
    const currentMessage = unreplied[0] ?? null;

    return NextResponse.json({
      currentMessage,
      messages: enriched,
      unreplied,
      replied,
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
