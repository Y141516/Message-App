export const dynamic = 'force-dynamic';
// waitUntil() keeps the queue-open/close broadcast running after the
// response is sent, but Vercel still caps total execution at maxDuration —
// raise it so a broadcast to a few thousand users has room to finish.
// Hobby plan caps this at 60s; Pro allows much higher (up to 800s).
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage, broadcastToTelegramUsers, TelegramMessages } from '@/lib/telegram';
import { runInBackground } from '@/lib/backgroundTask';

async function verifyLeader(telegram_id: string) {
  const { data } = await supabaseAdmin
    .from('leaders')
    .select('id, display_name, users!inner(telegram_id)')
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
      const limit = message_limit || 50;

      // Close any existing open queues first
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

      // BUG FIX: this was a bare `void notifyUsersQueueOpen(...)` — on Vercel
      // that background work can get silently killed the instant the HTTP
      // response is sent, since the platform tears down the function once it
      // thinks the request is done. For a few thousand users batched 25-at-a-
      // time with a 1s pause between batches, that's over a minute of work —
      // most of it was at risk of never actually running. waitUntil() tells
      // the platform to keep the function alive until this finishes.
      runInBackground(() => notifyUsersQueueOpen(leaderRow.display_name, limit));

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

      // Notify users + send summary to leader — same background-work fix as above
      runInBackground(() => notifyUsersQueueClosed(leaderRow.display_name, queue?.messages_received || 0));
      runInBackground(() => sendTelegramMessage(
        telegram_id,
        TelegramMessages.queueSummary(leaderRow.display_name, queue?.messages_received || 0, queue?.message_limit || 0)
      ));

      return NextResponse.json({ success: true, queue });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function notifyUsersQueueOpen(leaderName: string, limit: number) {
  const { data: users } = await supabaseAdmin
    .from('users').select('telegram_id').eq('role', 'user').eq('is_active', true);
  if (!users?.length) return;

  const message = TelegramMessages.queueOpened(leaderName, limit);
  const { sent, failed } = await broadcastToTelegramUsers(users.map(u => u.telegram_id), message);
  console.log(`[queue open] notified ${sent}/${users.length} users (${failed} failed)`);
}

async function notifyUsersQueueClosed(leaderName: string, totalReceived: number) {
  const { data: users } = await supabaseAdmin
    .from('users').select('telegram_id').eq('role', 'user').eq('is_active', true);
  if (!users?.length) return;

  const message = TelegramMessages.queueClosed(leaderName, totalReceived);
  const { sent, failed } = await broadcastToTelegramUsers(users.map(u => u.telegram_id), message);
  console.log(`[queue close] notified ${sent}/${users.length} users (${failed} failed)`);
}
