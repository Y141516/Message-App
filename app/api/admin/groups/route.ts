export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function verifyAdmin(telegram_id: string) {
  const { data } = await supabaseAdmin
    .from('users').select('id, role').eq('telegram_id', telegram_id).single();
  return data?.role === 'admin' ? data : null;
}

// GET /api/admin/groups — get all groups + telegram mappings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const [{ data: groups }, { data: mappings }] = await Promise.all([
      supabaseAdmin.from('groups').select('*').order('name'),
      supabaseAdmin.from('telegram_group_mappings').select('*, groups(id, name)').order('telegram_group_name'),
    ]);

    return NextResponse.json({ groups: groups || [], mappings: mappings || [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/groups — create group or add mapping
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, action, ...payload } = await req.json();
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    if (action === 'create_group') {
      const { data, error } = await supabaseAdmin
        .from('groups').insert({ name: payload.name, description: payload.description || null })
        .select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, group: data });
    }

    if (action === 'add_mapping') {
      const { data, error } = await supabaseAdmin
        .from('telegram_group_mappings')
        .upsert({
          telegram_group_id: payload.telegram_group_id,
          telegram_group_name: payload.telegram_group_name,
          internal_group_id: payload.internal_group_id,
        }, { onConflict: 'telegram_group_id' })
        .select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, mapping: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/admin/groups — delete group or mapping
export async function DELETE(req: NextRequest) {
  try {
    const { telegram_id, action, id } = await req.json();
    const admin = await verifyAdmin(telegram_id);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    if (action === 'delete_group') {
      await supabaseAdmin.from('groups').delete().eq('id', id);
    } else if (action === 'delete_mapping') {
      await supabaseAdmin.from('telegram_group_mappings').delete().eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
