export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Verify admin helper
async function verifyAdmin(telegram_id: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('telegram_id', telegram_id)
    .single();
  return data?.role === 'admin' ? data : null;
}

// GET /api/admin/users?telegram_id=xxx&page=0&search=xxx&role=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    const page = parseInt(searchParams.get('page') || '0');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all';
    const PAGE_SIZE = 20;

    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    let query = supabaseAdmin
      .from('users')
      .select(`
        id, telegram_id, name, city, phone, role, is_active, onboarding_complete, created_at,
        user_groups(groups(id, name))
      `, { count: 'exact' });

    if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,telegram_id.ilike.%${search}%`);
    if (role !== 'all') query = query.eq('role', role);

    query = query.order('created_at', { ascending: false });
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data: users, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ users: users || [], total: count || 0, hasMore: (count || 0) > (page + 1) * PAGE_SIZE });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/admin/users — update user role or status
export async function PATCH(req: NextRequest) {
  try {
    const { telegram_id, target_user_id, updates } = await req.json();
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const allowed = ['role', 'is_active'];
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    );

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(safeUpdates)
      .eq('id', target_user_id)
      .select()
      .single();

    if (error) throw error;

    // If promoting to leader, create leader record if not exists
    if (safeUpdates.role === 'leader') {
      const { data: existing } = await supabaseAdmin
        .from('leaders')
        .select('id')
        .eq('user_id', target_user_id)
        .single();

      if (!existing) {
        await supabaseAdmin.from('leaders').insert({
          user_id: target_user_id,
          display_name: data.name + ' ji',
        });
      }
    }

    return NextResponse.json({ success: true, user: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
