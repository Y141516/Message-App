export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/leader/messages?telegram_id=xxx&tab=unreplied|replied&page=0
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    const tab = searchParams.get('tab') || 'unreplied';
    const page = parseInt(searchParams.get('page') || '0');
    const city = searchParams.get('city') || '';
    const group_id = searchParams.get('group') || '';
    const sort = searchParams.get('sort') || 'newest';
    const type = searchParams.get('type') || 'all';
    const PAGE_SIZE = 20;

    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });

    const { data: leader } = await supabaseAdmin
      .from('leaders')
      .select('id, users!inner(telegram_id)')
      .eq('users.telegram_id', telegram_id)
      .single();

    if (!leader) return NextResponse.json({ error: 'Not a leader' }, { status: 403 });

    let query = supabaseAdmin
      .from('messages')
      .select(`
        id, content, message_type, media_url, media_type,
        is_emergency, is_replied, created_at,
        users!inner(id, name, city,
          user_groups(groups(id, name))
        ),
        replies(id, content, audio_url, reply_type, created_at)
      `, { count: 'exact' })
      .eq('leader_id', leader.id)
      .eq('is_replied', tab === 'replied');

    if (type === 'emergency') query = query.eq('is_emergency', true);
    if (type === 'regular') query = query.eq('is_emergency', false);
    if (city) query = query.eq('users.city', city);

    const ascending = sort === 'oldest';
    query = query.order('created_at', { ascending });
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data: messages, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      messages: messages || [],
      total: count || 0,
      page,
      hasMore: ((count || 0) > (page + 1) * PAGE_SIZE),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
