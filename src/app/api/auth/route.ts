import { NextRequest, NextResponse } from 'next/server';
import {
  verifyTelegramWebAppData,
  extractTelegramUser,
  getUserByTelegramId,
  checkUserGroupMembership,
  createSessionToken,
} from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();

    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
    }

    // 1. Verify the Telegram hash (CRITICAL security step)
    const isValid = verifyTelegramWebAppData(initData);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 401 });
    }

    // 2. Extract user info
    const tgUser = extractTelegramUser(initData);
    if (!tgUser) {
      return NextResponse.json({ error: 'Could not extract user' }, { status: 400 });
    }

    // 3. Check group membership via bot
    const memberGroupIds = await checkUserGroupMembership(tgUser.telegram_id);

    // 4. Check if user exists in DB
    let user = await getUserByTelegramId(tgUser.telegram_id);

    if (!user) {
      // New user - return status so frontend can show onboarding
      return NextResponse.json({
        status: 'new_user',
        telegram_user: tgUser,
        group_ids: memberGroupIds,
      });
    }

    if (memberGroupIds.length === 0 && user.role === 'user') {
      return NextResponse.json({ error: 'Not a member of any valid group' }, { status: 403 });
    }

    // 5. Update group memberships
    if (memberGroupIds.length > 0) {
      // Get existing memberships
      const { data: existing } = await supabaseAdmin
        .from('user_groups')
        .select('group_id')
        .eq('user_id', user.id);
      const existingIds = new Set((existing || []).map((e: { group_id: string }) => e.group_id));

      // Add new memberships
      const toAdd = memberGroupIds.filter((id) => !existingIds.has(id));
      if (toAdd.length > 0) {
        await supabaseAdmin.from('user_groups').insert(
          toAdd.map((group_id) => ({ user_id: user!.id, group_id }))
        );
      }
    }

    // 6. Create session token
    const token = createSessionToken(tgUser.telegram_id);

    return NextResponse.json({
      status: 'authenticated',
      user,
      token,
    });
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
