export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/queues — fetch all open queues with leader info
export async function GET() {
  try {
    const { data: queues, error } = await supabaseAdmin
      .from('queues')
      .select(`
        *,
        leaders(
          id,
          display_name,
          user_id
        )
      `)
      .eq('is_open', true)
      .lt('messages_received', supabaseAdmin.from('queues').select('message_limit'));

    // Simpler query
    const { data, error: err } = await supabaseAdmin
      .from('queues')
      .select(`*, leaders(id, display_name, avatar_url)`)
      .eq('is_open', true);

    if (err) throw err;

    // Filter out queues that hit their limit
    const openQueues = data?.filter(q => q.messages_received < q.message_limit) ?? [];

    return NextResponse.json({ queues: openQueues });
  } catch (error) {
    console.error('Queues fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch queues' }, { status: 500 });
  }
}
