export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/groups — fetch all internal groups (used by announcements)
export async function GET() {
  try {
    const { data: groups, error } = await supabaseAdmin
      .from('groups')
      .select('id, name, description')
      .order('name');

    if (error) throw error;
    return NextResponse.json({ groups: groups || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
