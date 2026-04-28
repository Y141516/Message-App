export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

// GET /api/announcements?telegram_id=xxx — get active announcements for user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, user_groups(group_id)')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user) return NextResponse.json({ announcements: [] });

    const userGroupIds = (user.user_groups || []).map((ug: any) => ug.group_id);

    // Get announcements not dismissed by this user
    const { data: dismissed } = await supabaseAdmin
      .from('announcement_dismissals')
      .select('announcement_id')
      .eq('user_id', user.id);

    const dismissedIds = (dismissed || []).map((d: any) => d.announcement_id);

    let query = supabaseAdmin
      .from('announcements')
      .select(`id, title, body, target, group_id, created_at, users!sent_by(name, role)`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (dismissedIds.length > 0) {
      query = query.not('id', 'in', `(${dismissedIds.join(',')})`);
    }

    const { data: announcements } = await query;

    // Filter: show 'all' target + matching group target
    const filtered = (announcements || []).filter((a: any) =>
      a.target === 'all' ||
      (a.target === 'group' && userGroupIds.includes(a.group_id))
    );

    return NextResponse.json({ announcements: filtered });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ announcements: [] });
  }
}

// POST /api/announcements — create + broadcast announcement
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, title, body, target, group_id } = await req.json();
    if (!telegram_id || !title || !body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role, name')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user || !['admin', 'leader'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Save announcement
    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({ title, body, sent_by: user.id, target: target || 'all', group_id: group_id || null })
      .select()
      .single();

    if (error) throw error;

    // Send via Telegram bot — fire and forget
    void broadcastAnnouncement(user.name, title, body, target, group_id);

    // Update telegram_sent
    await supabaseAdmin
      .from('announcements')
      .update({ telegram_sent: true })
      .eq('id', announcement.id);

    return NextResponse.json({ success: true, announcement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/announcements/dismiss — user dismisses a banner
export async function PATCH(req: NextRequest) {
  try {
    const { telegram_id, announcement_id } = await req.json();
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await supabaseAdmin
      .from('announcement_dismissals')
      .upsert({ user_id: user.id, announcement_id }, { onConflict: 'user_id,announcement_id' });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function broadcastAnnouncement(senderName: string, title: string, body: string, target: string, group_id?: string) {
  let users: any[] = [];

  if (target === 'all') {
    const { data } = await supabaseAdmin
      .from('users')
      .select('telegram_id')
      .eq('role', 'user')
      .eq('is_active', true);
    users = data || [];
  } else if (target === 'group' && group_id) {
    const { data } = await supabaseAdmin
      .from('user_groups')
      .select('users(telegram_id, is_active)')
      .eq('group_id', group_id);
    users = (data || [])
      .map((ug: any) => ug.users)
      .filter((u: any) => u?.is_active);
  }

  const message = `📢 *${title}*\n\n${body}\n\n— ${senderName}`;
  const batchSize = 25;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.allSettled(batch.map((u: any) => sendTelegramMessage(u.telegram_id, message)));
    if (i + batchSize < users.length) await new Promise(r => setTimeout(r, 1000));
  }
}
