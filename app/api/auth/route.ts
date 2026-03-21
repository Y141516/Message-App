export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramInitData, parseTelegramUser, checkUserGroupMembership } from '@/lib/telegram';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();
    if (!initData) {
      return NextResponse.json({ error: 'No initData provided' }, { status: 400 });
    }

    // Validate Telegram signature
    const isValid = validateTelegramInitData(initData);
    if (!isValid) {
      // Allow in dev mode for testing
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 401 });
      }
    }

    const tgUser = parseTelegramUser(initData);
    if (!tgUser) {
      return NextResponse.json({ error: 'Could not parse user' }, { status: 400 });
    }

    const telegramId = String(tgUser.id);

    // Check if user exists in DB
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select(`*, user_groups(group_id, groups(id, name))`)
      .eq('telegram_id', telegramId)
      .single();

    if (existingUser) {
      // Fetch groups for the user
      const groups = existingUser.user_groups?.map((ug: any) => ug.groups) ?? [];

      return NextResponse.json({
        success: true,
        user: { ...existingUser, groups },
        isNewUser: false,
      });
    }

    // New user — check group membership via bot
    const { data: mappings } = await supabaseAdmin
      .from('telegram_group_mappings')
      .select('telegram_group_id, internal_group_id, groups(id, name)');

    const telegramGroupIds = mappings?.map((m: any) => m.telegram_group_id) ?? [];
    const memberGroupIds = await checkUserGroupMembership(telegramId, telegramGroupIds);

    if (memberGroupIds.length === 0) {
      return NextResponse.json({
        error: 'not_a_member',
        message: 'You must be a member of at least one valid group to use this app.',
      }, { status: 403 });
    }

    // Map telegram group IDs to internal groups
    const internalGroups = mappings
      ?.filter((m: any) => memberGroupIds.includes(m.telegram_group_id))
      .map((m: any) => m.groups) ?? [];

    return NextResponse.json({
      success: true,
      user: null,
      isNewUser: true,
      telegramUser: tgUser,
      telegramId,
      internalGroups,
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
