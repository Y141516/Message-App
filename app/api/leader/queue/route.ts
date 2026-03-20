import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

// GET /api/leader/queue?telegram_id=xxx — get current queue status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });

    const { data: leader } = await supabaseAdmin
      .from('leaders')
      .select('id, display_name, users!inner(telegram_id)')
      .eq('users.telegram_id', telegram_id)
      .single();

    if (!leader) return NextResponse.json({ error: 'Leader not found' }, { status: 404 });

    const { data: queue } = await supabaseAdmin
      .from('queues')
      .select('*')
      .eq('leader_id', leader.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ leader, queue: queue || null });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/leader/queue — open or close queue
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, action, message_limit } = await req.json();
    if (!telegram_id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Get leader
    const { data: leaderRow } = await supabaseAdmin
      .from('leaders')
      .select('id, display_name, users!inner(telegram_id)')
      .eq('users.telegram_id', telegram_id)
      .single();

    if (!leaderRow) return NextResponse.json({ error: 'Leader not found' }, { status: 404 });

    if (action === 'open') {
      const limit = message_limit || 100;

      // Close any existing open queues first
      await supabaseAdmin
        .from('queues')
        .update({ is_open: false, closed_at: new Date().toISOString() })
        .eq('leader_id', leaderRow.id)
        .eq('is_open', true);

      // Create new queue
      const { data: queue, error } = await supabaseAdmin
        .from('queues')
        .insert({
          leader_id: leaderRow.id,
          is_open: true,
          message_limit: limit,
          messages_received: 0,
          opened_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Notify all users via Telegram bot
      notifyAllUsers(leaderRow.display_name, limit).catch(() => {});

      return NextResponse.json({ success: true, queue });

    } else if (action === 'close') {
      const { data: queue, error } = await supabaseAdmin
        .from('queues')
        .update({ is_open: false, closed_at: new Date().toISOString() })
        .eq('leader_id', leaderRow.id)
        .eq('is_open', true)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, queue });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function notifyAllUsers(leaderName: string, limit: number) {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('telegram_id')
    .eq('role', 'user')
    .eq('is_active', true);

  if (!users) return;

  const message = `🟢 ${leaderName} ji has opened the queue for ${limit} messages.\n\nOpen the app to send your message now.`;

  // Send in batches to avoid Telegram rate limits
  const batchSize = 25;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(u => sendTelegramMessage(u.telegram_id, message))
    );
    if (i + batchSize < users.length) {
      await new Promise(r => setTimeout(r, 1000)); // 1s delay between batches
    }
  }
}
