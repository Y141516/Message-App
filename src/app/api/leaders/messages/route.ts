import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyReplyReceived } from '@/lib/telegram';

// GET /api/leaders/messages - Get messages for a leader
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.slice(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const telegramId = verifySessionToken(token);
    if (!telegramId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('telegram_id', telegramId)
      .single();

    if (!user || user.role !== 'leader') {
      return NextResponse.json({ error: 'Not a leader' }, { status: 403 });
    }

    const { data: leader } = await supabaseAdmin
      .from('leaders')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!leader) return NextResponse.json({ error: 'Leader not found' }, { status: 404 });

    const url = new URL(req.url);
    const tab = url.searchParams.get('tab') || 'unreplied'; // unreplied | replied
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const city = url.searchParams.get('city');
    const group = url.searchParams.get('group');
    const sort = url.searchParams.get('sort') || 'desc'; // asc | desc

    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        user:users(
          id, name, city, telegram_id,
          user_groups(group:groups(name))
        ),
        reply:replies(*)
      `, { count: 'exact' })
      .eq('leader_id', leader.id)
      .eq('is_replied', tab === 'replied')
      .order('created_at', { ascending: sort === 'asc' })
      .range(offset, offset + limit - 1);

    if (city) {
      query = query.eq('user.city', city);
    }

    const { data: messages, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({ messages: messages || [], total: count || 0 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/leaders/messages - Send reply (leader)
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.slice(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const telegramId = verifySessionToken(token);
    if (!telegramId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { message_id, content, reply_type, audio_url } = await req.json();

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('telegram_id', telegramId)
      .single();

    if (!user || user.role !== 'leader') {
      return NextResponse.json({ error: 'Not a leader' }, { status: 403 });
    }

    const { data: leader } = await supabaseAdmin
      .from('leaders')
      .select('id, display_name')
      .eq('user_id', user.id)
      .single();

    if (!leader) return NextResponse.json({ error: 'Leader not found' }, { status: 404 });

    // Verify the message belongs to this leader
    const { data: message } = await supabaseAdmin
      .from('messages')
      .select('id, user_id, is_replied, user:users(telegram_id)')
      .eq('id', message_id)
      .eq('leader_id', leader.id)
      .single();

    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    if (message.is_replied) {
      return NextResponse.json({ error: 'Already replied' }, { status: 400 });
    }

    // Create reply
    const { data: reply, error } = await supabaseAdmin
      .from('replies')
      .insert({
        message_id,
        leader_id: leader.id,
        content: content || null,
        reply_type,
        audio_url: audio_url || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Mark message as replied
    await supabaseAdmin
      .from('messages')
      .update({ is_replied: true })
      .eq('id', message_id);

    // Notify user
    const userTelegramId = (message.user as { telegram_id: number })?.telegram_id;
    if (userTelegramId) {
      notifyReplyReceived(
        userTelegramId,
        leader.display_name,
        process.env.NEXT_PUBLIC_APP_URL || ''
      );
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
