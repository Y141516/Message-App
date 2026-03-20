import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/users — create a new user (onboarding)
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, name, city, phone, telegramUser, internalGroupIds } = await req.json();

    if (!telegram_id || !name || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        telegram_id,
        name: name.trim(),
        city: city.trim(),
        phone: phone?.trim() || null,
        role: 'user',
        onboarding_complete: true,
      })
      .select()
      .single();

    if (userError) throw userError;

    // Assign user to groups
    if (internalGroupIds && internalGroupIds.length > 0) {
      const userGroupInserts = internalGroupIds.map((groupId: string) => ({
        user_id: user.id,
        group_id: groupId,
        verified: true,
      }));

      await supabaseAdmin.from('user_groups').insert(userGroupInserts);
    }

    // Fetch groups
    const { data: userGroups } = await supabaseAdmin
      .from('user_groups')
      .select('groups(id, name)')
      .eq('user_id', user.id);

    const groups = userGroups?.map((ug: any) => ug.groups) ?? [];

    return NextResponse.json({ success: true, user: { ...user, groups } });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
