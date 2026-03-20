import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyQueueOpened } from '@/lib/telegram';

// GET /api/queues - Get all open queues (for users to see)
export async function GET(req: NextRequest) {
  try {
    const { data: queues, error } = await supabaseAdmin
      .from('queues')
      .select(`
        *,
        leader:leaders(
          id,
          display_name,
          user:users(name, telegram_id)
        )
      `)
      .eq('is_open', true)
      .order('opened_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ queues: queues || [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/queues - Open a queue (leader only)
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.slice(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const telegramId = verifySessionToken(token);
    if (!telegramId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { message_limit } = await req.json();

    // Get leader record
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

    // Close any existing open queues for this leader
    await supabaseAdmin
      .from('queues')
      .update({ is_open: false, closed_at: new Date().toISOString() })
      .eq('leader_id', leader.id)
      .eq('is_open', true);

    // Create new queue
    const { data: queue, error } = await supabaseAdmin
      .from('queues')
      .insert({
        leader_id: leader.id,
        is_open: true,
        message_limit: message_limit || 100,
        messages_received: 0,
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Notify all active users
    const { data: allUsers } = await supabaseAdmin
      .from('users')
      .select('telegram_id')
      .eq('is_active', true)
      .eq('role', 'user');

    const telegramIds = (allUsers || []).map((u: { telegram_id: number }) => u.telegram_id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // Fire and forget
    notifyQueueOpened(leader.display_name, message_limit || 100, telegramIds, appUrl);

    return NextResponse.json({ queue });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/queues - Close queue (leader only)
export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.slice(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const telegramId = verifySessionToken(token);
    if (!telegramId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { queue_id } = await req.json();

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

    await supabaseAdmin
      .from('queues')
      .update({ is_open: false, closed_at: new Date().toISOString() })
      .eq('id', queue_id)
      .eq('leader_id', leader.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
