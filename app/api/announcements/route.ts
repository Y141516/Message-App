export const dynamic = 'force-dynamic';
// Same reasoning as /api/leader/queue — the announcement broadcast runs via
// waitUntil() after the response is sent, so it needs room within maxDuration.
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { TelegramMessages, broadcastToTelegramUsers } from '@/lib/telegram';
import { runInBackground } from '@/lib/backgroundTask';

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

    const { data: dismissed } = await supabaseAdmin
      .from('announcement_dismissals')
      .select('announcement_id')
      .eq('user_id', user.id);

    const dismissedIds = (dismissed || []).map((d: any) => d.announcement_id);

    let query = supabaseAdmin
      .from('announcements')
      .select('id, title, body, target, group_ids, created_at, users!sent_by(name, role)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (dismissedIds.length > 0) {
      query = query.not('id', 'in', `(${dismissedIds.join(',')})`);
    }

    const { data: announcements } = await query;

    // Filter: 'all' shows to everyone; 'group' shows if user is in any of the target groups
    const filtered = (announcements || []).filter((a: any) => {
      if (a.target === 'all') return true;
      if (a.target === 'group' && a.group_ids) {
        const targetGroups = Array.isArray(a.group_ids) ? a.group_ids : [];
        return targetGroups.some((gid: string) => userGroupIds.includes(gid));
      }
      return false;
    });

    return NextResponse.json({ announcements: filtered });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ announcements: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { telegram_id, title, body, target, group_ids } = await req.json();
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

    // Save — body has NO character limit
    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        body,
        sent_by: user.id,
        target: target || 'all',
        group_ids: group_ids || null, // array of group UUIDs
      })
      .select()
      .single();

    if (error) throw error;

    // Broadcast via Telegram bot — kept alive after the response via waitUntil
    // (see lib/backgroundTask.ts) since this can take a while for a large group
    runInBackground(() => broadcastAnnouncement(user.name, title, body, target, group_ids));
    await supabaseAdmin.from('announcements').update({ telegram_sent: true }).eq('id', announcement.id);

    return NextResponse.json({ success: true, announcement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { telegram_id, announcement_id } = await req.json();
    const { data: user } = await supabaseAdmin
      .from('users').select('id').eq('telegram_id', telegram_id).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await supabaseAdmin
      .from('announcement_dismissals')
      .upsert({ user_id: user.id, announcement_id }, { onConflict: 'user_id,announcement_id' });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function broadcastAnnouncement(
  senderName: string,
  title: string,
  body: string,
  target: string,
  group_ids?: string[]
) {
  let users: any[] = [];

  if (target === 'all') {
    const { data } = await supabaseAdmin
      .from('users').select('telegram_id').eq('role', 'user').eq('is_active', true);
    users = data || [];
  } else if (target === 'group' && group_ids?.length) {
    // Get users belonging to ANY of the selected groups
    const { data } = await supabaseAdmin
      .from('user_groups')
      .select('users!inner(telegram_id, is_active, role)')
      .in('group_id', group_ids);
    users = (data || [])
      .map((ug: any) => ug.users)
      .filter((u: any) => u?.is_active && u?.role === 'user');
    // Deduplicate by telegram_id
    const seen = new Set<string>();
    users = users.filter((u: any) => {
      if (seen.has(u.telegram_id)) return false;
      seen.add(u.telegram_id);
      return true;
    });
  }

  // HTML formatted announcement message
  const message = TelegramMessages.announcement(senderName, title, body);
  const { sent, failed } = await broadcastToTelegramUsers(users.map((u: any) => u.telegram_id), message);
  console.log(`[announcement] notified ${sent}/${users.length} users (${failed} failed)`);
}
