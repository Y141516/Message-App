export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

async function verifyLeader(telegram_id: string) {
  const { data } = await supabaseAdmin
    .from('leaders')
    .select('id, display_name, users!inner(telegram_id, role)')
    .eq('users.telegram_id', telegram_id)
    .single();
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });

    const leader = await verifyLeader(telegram_id);
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

export async function POST(req: NextRequest) {
  try {
    const { telegram_id, action, message_limit } = await req.json();
    if (!telegram_id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const leaderRow = await verifyLeader(telegram_id);
    if (!leaderRow) return NextResponse.json({ error: 'Leader not found' }, { status: 404 });

    if (action === 'open') {
      const limit = message_limit || 100;

      await supabaseAdmin
        .from('queues')
        .update({ is_open: false, closed_at: new Date().toISOString() })
        .eq('leader_id', leaderRow.id)
        .eq('is_open', true);

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

      // Notify ALL users — fire and forget
      void notifyUsersQueueOpen(leaderRow.display_name, limit);

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

      // Notify users queue closed + notify leader with stats
      void notifyUsersQueueClosed(leaderRow.display_name, queue?.messages_received || 0);
      void notifyLeaderQueueStats(telegram_id, leaderRow.display_name, queue?.messages_received || 0, queue?.message_limit || 0);

      return NextResponse.json({ success: true, queue });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── Notification helpers ─────────────────────────────────

async function notifyUsersQueueOpen(leaderName: string, limit: number) {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('telegram_id')
    .eq('role', 'user')
    .eq('is_active', true);

  if (!users?.length) return;

  const message = `🟢 *Queue Opened!*\n\n${leaderName} ji has opened the queue for *${limit} messages*.\n\nOpen the app now to send your message! 🙏`;

  // Send in batches of 25 to respect Telegram rate limits
  const batchSize = 25;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(u => sendTelegramMessage(u.telegram_id, message)));
    if (i + batchSize < users.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function notifyUsersQueueClosed(leaderName: string, totalReceived: number) {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('telegram_id')
    .eq('role', 'user')
    .eq('is_active', true);

  if (!users?.length) return;

  const message = `🔴 *Queue Closed*\n\n${leaderName} ji's queue is now closed.\n\n${totalReceived} messages were received. You will receive a reply soon. 🙏`;

  const batchSize = 25;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(u => sendTelegramMessage(u.telegram_id, message)));
    if (i + batchSize < users.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function notifyLeaderQueueStats(leaderTelegramId: string, leaderName: string, received: number, limit: number) {
  const message = `📊 *Queue Summary — ${leaderName} ji*\n\nTotal messages received: *${received}* / ${limit}\n\nOpen the app to start replying. 🙏`;
  await sendTelegramMessage(leaderTelegramId, message);
}
