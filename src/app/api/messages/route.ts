import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyEmergencyAck } from '@/lib/telegram';

// GET /api/messages - Get user's messages
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.slice(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const telegramId = verifySessionToken(token);
    if (!telegramId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data: messages, count, error } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        leader:leaders(id, display_name),
        reply:replies(*)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      messages: messages || [],
      total: count || 0,
      page,
      limit,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/messages - Send a message
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.slice(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const telegramId = verifySessionToken(token);
    if (!telegramId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { leader_id, content, message_type, is_emergency, media_url, media_type } = body;

    if (!leader_id || !content || !message_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role, emergency_count_today, emergency_reset_date')
      .eq('telegram_id', telegramId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let queue_id: string | null = null;

    if (is_emergency) {
      // Check emergency limit (3/day)
      const today = new Date().toISOString().split('T')[0];
      let emergencyCount = user.emergency_count_today;

      if (user.emergency_reset_date < today) {
        emergencyCount = 0;
        await supabaseAdmin
          .from('users')
          .update({ emergency_count_today: 0, emergency_reset_date: today })
          .eq('id', user.id);
      }

      if (emergencyCount >= 3) {
        return NextResponse.json(
          { error: 'Emergency message limit reached (3 per day)' },
          { status: 429 }
        );
      }

      // Increment emergency count
      await supabaseAdmin
        .from('users')
        .update({ emergency_count_today: emergencyCount + 1 })
        .eq('id', user.id);
    } else {
      // Check queue is open
      const { data: queue } = await supabaseAdmin
        .from('queues')
        .select('id, is_open, message_limit, messages_received')
        .eq('leader_id', leader_id)
        .eq('is_open', true)
        .single();

      if (!queue) {
        return NextResponse.json({ error: 'Queue is closed' }, { status: 400 });
      }

      // Check if user already sent a message in this queue
      const { data: existingMsg } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('user_id', user.id)
        .eq('queue_id', queue.id)
        .single();

      if (existingMsg) {
        return NextResponse.json(
          { error: 'You already sent a message in this queue' },
          { status: 400 }
        );
      }

      queue_id = queue.id;

      // Increment queue counter
      await supabaseAdmin
        .from('queues')
        .update({ messages_received: queue.messages_received + 1 })
        .eq('id', queue.id);

      // Auto-close if limit reached
      if (queue.messages_received + 1 >= queue.message_limit) {
        await supabaseAdmin
          .from('queues')
          .update({ is_open: false, closed_at: new Date().toISOString() })
          .eq('id', queue.id);
      }
    }

    // Create message
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert({
        user_id: user.id,
        leader_id,
        queue_id,
        content,
        message_type,
        is_emergency: !!is_emergency,
        media_url: media_url || null,
        media_type: media_type || null,
        is_replied: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Send emergency ack notification
    if (is_emergency) {
      const { data: leader } = await supabaseAdmin
        .from('leaders')
        .select('display_name')
        .eq('id', leader_id)
        .single();

      if (leader) {
        notifyEmergencyAck(telegramId, leader.display_name);
      }
    }

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
