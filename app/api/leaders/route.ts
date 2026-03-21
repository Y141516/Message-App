export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/leaders — fetch all leaders
export async function GET() {
  try {
    const { data: leaders, error } = await supabaseAdmin
      .from('leaders')
      .select(`*, users(name, telegram_id)`);

    if (error) throw error;

    return NextResponse.json({ leaders });
  } catch (error) {
    console.error('Leaders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaders' }, { status: 500 });
  }
}
