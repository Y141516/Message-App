export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { count } = await supabaseAdmin
      .from('vachans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const randomOffset = Math.floor(Math.random() * (count || 1));

    const { data, error } = await supabaseAdmin
      .from('vachans')
      .select('*')
      .eq('is_active', true)
      .range(randomOffset, randomOffset)
      .single();

    if (error || !data) throw error;

    return NextResponse.json({ vachan: data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vachan' }, { status: 500 });
  }
}
