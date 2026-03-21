export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function verifyAdmin(telegram_id: string) {
  const { data } = await supabaseAdmin
    .from('users').select('id, role').eq('telegram_id', telegram_id).single();
  return data?.role === 'admin' ? data : null;
}

// GET /api/admin/analytics?telegram_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { count: totalUsers },
      { count: totalLeaders },
      { count: totalMessages },
      { count: totalReplies },
      { count: todayMessages },
      { count: todayUsers },
      { count: totalEmergency },
      { count: pendingMessages },
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'leader'),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('replies').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).eq('is_emergency', true),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).eq('is_replied', false),
    ]);

    // Messages by day (last 7 days)
    const { data: recentMessages } = await supabaseAdmin
      .from('messages')
      .select('created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true });

    // Group by day
    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      byDay[key] = 0;
    }
    (recentMessages || []).forEach(m => {
      const d = new Date(m.created_at);
      const key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (byDay[key] !== undefined) byDay[key]++;
    });

    // Messages by group
    const { data: msgByGroup } = await supabaseAdmin
      .from('messages')
      .select('users!inner(user_groups(groups(name)))')
      .limit(500);

    const groupCounts: Record<string, number> = {};
    (msgByGroup || []).forEach((m: any) => {
      const groups = m.users?.user_groups?.map((ug: any) => ug.groups?.name).filter(Boolean) || [];
      groups.forEach((g: string) => { groupCounts[g] = (groupCounts[g] || 0) + 1; });
    });

    return NextResponse.json({
      overview: {
        totalUsers: totalUsers || 0,
        totalLeaders: totalLeaders || 0,
        totalMessages: totalMessages || 0,
        totalReplies: totalReplies || 0,
        todayMessages: todayMessages || 0,
        todayNewUsers: todayUsers || 0,
        totalEmergency: totalEmergency || 0,
        pendingMessages: pendingMessages || 0,
        replyRate: totalMessages ? Math.round(((totalReplies || 0) / totalMessages) * 100) : 0,
      },
      chartData: Object.entries(byDay).map(([date, count]) => ({ date, count })),
      groupData: Object.entries(groupCounts).map(([name, count]) => ({ name, count })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
