export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/leader/stats?telegram_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });

    const { data: leader } = await supabaseAdmin
      .from('leaders')
      .select('id, users!inner(telegram_id)')
      .eq('users.telegram_id', telegram_id)
      .single();

    if (!leader) return NextResponse.json({ error: 'Not a leader' }, { status: 403 });

    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const todayEnd = `${today}T23:59:59.999Z`;

    const [
      { count: totalMessages },
      { count: totalEmergency },
      { count: totalReplies },
      { count: todayMessages },
      { count: todayReplies },
      { count: pendingMessages },
    ] = await Promise.all([
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).eq('leader_id', leader.id),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).eq('leader_id', leader.id).eq('is_emergency', true),
      supabaseAdmin.from('replies').select('*', { count: 'exact', head: true }).eq('leader_id', leader.id),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).eq('leader_id', leader.id).gte('created_at', todayStart).lte('created_at', todayEnd),
      supabaseAdmin.from('replies').select('*', { count: 'exact', head: true }).eq('leader_id', leader.id).gte('created_at', todayStart).lte('created_at', todayEnd),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).eq('leader_id', leader.id).eq('is_replied', false),
    ]);

    // Average response time (in hours)
    const { data: repliesWithTime } = await supabaseAdmin
      .from('replies')
      .select('created_at, messages!inner(created_at)')
      .eq('leader_id', leader.id)
      .limit(50)
      .order('created_at', { ascending: false });

    let avgResponseHours = 0;
    if (repliesWithTime && repliesWithTime.length > 0) {
      const totalMs = repliesWithTime.reduce((sum, r) => {
        const msgTime = new Date((r.messages as any).created_at).getTime();
        const replyTime = new Date(r.created_at).getTime();
        return sum + (replyTime - msgTime);
      }, 0);
      avgResponseHours = Math.round((totalMs / repliesWithTime.length) / 3600000 * 10) / 10;
    }

    return NextResponse.json({
      stats: {
        totalMessages: totalMessages || 0,
        totalEmergency: totalEmergency || 0,
        totalReplies: totalReplies || 0,
        todayMessages: todayMessages || 0,
        todayReplies: todayReplies || 0,
        pendingMessages: pendingMessages || 0,
        avgResponseHours,
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
