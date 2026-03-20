import { NextRequest, NextResponse } from 'next/server';
import { verifyTelegramWebAppData, extractTelegramUser, createSessionToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { initData, name, city, phone, group_ids } = await req.json();

    if (!initData || !name || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Telegram data again
    const isValid = verifyTelegramWebAppData(initData);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 401 });
    }

    const tgUser = extractTelegramUser(initData);
    if (!tgUser) {
      return NextResponse.json({ error: 'Could not extract user' }, { status: 400 });
    }

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', tgUser.telegram_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User already registered' }, { status: 409 });
    }

    // Create user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        telegram_id: tgUser.telegram_id,
        telegram_username: tgUser.username || null,
        name: name.trim(),
        city: city.trim(),
        phone: phone?.trim() || null,
        role: 'user',
      })
      .select()
      .single();

    if (error || !newUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Add group memberships
    if (group_ids && group_ids.length > 0) {
      await supabaseAdmin.from('user_groups').insert(
        group_ids.map((group_id: string) => ({ user_id: newUser.id, group_id }))
      );
    }

    const token = createSessionToken(tgUser.telegram_id);

    return NextResponse.json({ user: newUser, token });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
