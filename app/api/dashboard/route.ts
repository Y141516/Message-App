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

    // Fetch ALL messages for this user with leader + reply info
    const { data: messages, error } = await supabaseAdmin
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
        leaders(
          id,
          display_name,
          avatar_url
        ),
        replies(
          id,
          content,
          audio_url,
          reply_type,
          created_at
        )
      `)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Split into current (latest unreplied) and history (all replied)
    const unreplied = messages?.filter(m => !m.is_replied) ?? [];
    const replied = messages?.filter(m => m.is_replied) ?? [];

    // Current message = latest unreplied
    const currentMessage = unreplied[0] ?? null;

    return NextResponse.json({
      currentMessage,
      messages: messages ?? [],
      unreplied,
      replied,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
