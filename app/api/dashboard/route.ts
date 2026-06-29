export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });

    const { data: user } = await supabaseAdmin
      .from('users').select('id').eq('telegram_id', telegram_id).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fetch all messages with leader info
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select(`
        id, content, message_type, media_url, media_type,
        user_voice_url, is_emergency, is_replied, created_at, leader_id,
        leaders(id, display_name, avatar_url)
      `)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (msgError) throw msgError;
    if (!messages?.length) {
      return NextResponse.json({ currentMessage: null, messages: [], unreplied: [], replied: [] });
    }

    // Fetch replies for all messages separately (avoid nested join issues)
    const messageIds = messages.map(m => m.id);
    const { data: replies } = await supabaseAdmin
      .from('replies')
      .select('id, message_id, content, audio_url, reply_type, created_at')
      .in('message_id', messageIds);

    // Build reply map
    const replyMap = new Map((replies || []).map(r => [r.message_id, r]));

    // Merge — critically: use is_replied from DB (updated immediately on reply)
    const enriched = messages.map(m => ({
      ...m,
      replies: replyMap.has(m.id) ? [replyMap.get(m.id)] : [],
      // Double-check: if a reply exists, force is_replied=true even if DB hasn't updated yet
      is_replied: m.is_replied || replyMap.has(m.id),
    }));

    // Strict split — no message appears in both tabs
    const unreplied = enriched.filter(m => !m.is_replied);
    const replied   = enriched.filter(m => m.is_replied);

    // Current = the LATEST message that has no reply
    const currentMessage = unreplied.length > 0 ? unreplied[0] : null;

    return NextResponse.json({
      currentMessage,
      messages: enriched,
      unreplied,
      replied,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
