import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function verifyAdmin(telegram_id: string) {
  const { data } = await supabaseAdmin.from('users').select('id, role').eq('telegram_id', telegram_id).single();
  return data?.role === 'admin' ? data : null;
}

// GET /api/admin/leaders?telegram_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id') || '';
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { data: leaders, error } = await supabaseAdmin
      .from('leaders')
      .select(`
        id, display_name, avatar_url, created_at,
        users(id, name, telegram_id, city, is_active),
        queues(id, is_open, message_limit, messages_received, opened_at, closed_at)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ leaders: leaders || [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/leaders — assign leader role to a user
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, user_id, display_name } = await req.json();
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // Update role
    const { error: roleError } = await supabaseAdmin
      .from('users').update({ role: 'leader' }).eq('id', user_id);
    if (roleError) throw roleError;

    // Create leader record (upsert)
    const { data: leader, error: leaderError } = await supabaseAdmin
      .from('leaders')
      .upsert({ user_id, display_name }, { onConflict: 'user_id' })
      .select().single();
    if (leaderError) throw leaderError;

    return NextResponse.json({ success: true, leader });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/admin/leaders — remove leader role
export async function DELETE(req: NextRequest) {
  try {
    const { telegram_id, leader_id, user_id } = await req.json();
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await supabaseAdmin.from('leaders').delete().eq('id', leader_id);
    await supabaseAdmin.from('users').update({ role: 'user' }).eq('id', user_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
