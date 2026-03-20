import crypto from 'crypto';
import { supabaseAdmin } from './supabase';
import { User } from '@/types';

// ============================================================
// TELEGRAM WEBAPP AUTHENTICATION
// ============================================================

/**
 * Verifies the Telegram WebApp initData hash
 * This is CRITICAL security - never skip this on the server
 */
export function verifyTelegramWebAppData(initData: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    // Build the data-check-string (all params sorted alphabetically except hash)
    urlParams.delete('hash');
    const dataCheckArray: string[] = [];
    urlParams.forEach((value, key) => {
      dataCheckArray.push(`${key}=${value}`);
    });
    dataCheckArray.sort();
    const dataCheckString = dataCheckArray.join('\n');

    // Compute HMAC
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN!)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return computedHash === hash;
  } catch {
    return false;
  }
}

/**
 * Extract user data from Telegram initData
 */
export function extractTelegramUser(initData: string): {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
} | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');
    if (!userParam) return null;
    const user = JSON.parse(decodeURIComponent(userParam));
    return {
      telegram_id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
    };
  } catch {
    return null;
  }
}

/**
 * Get user from DB by telegram_id
 */
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      *,
      user_groups(
        group:groups(*)
      )
    `)
    .eq('telegram_id', telegramId)
    .single();

  if (error || !data) return null;

  // Flatten groups
  const groups = data.user_groups?.map((ug: { group: unknown }) => ug.group) || [];
  return { ...data, groups };
}

/**
 * Check if user belongs to at least one valid group via Telegram bot
 */
export async function checkUserGroupMembership(telegramId: number): Promise<string[]> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;

    // Get all active groups from DB
    const { data: groups } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('is_active', true)
      .not('telegram_group_id', 'is', null);

    if (!groups || groups.length === 0) return [];

    const memberGroups: string[] = [];

    // Check membership in each group
    await Promise.all(
      groups.map(async (group: { telegram_group_id: string; id: string; name: string }) => {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${group.telegram_group_id}&user_id=${telegramId}`
          );
          const result = await res.json();

          if (
            result.ok &&
            ['member', 'administrator', 'creator'].includes(result.result?.status)
          ) {
            memberGroups.push(group.id);
          }
        } catch {
          // Group check failed, skip
        }
      })
    );

    return memberGroups;
  } catch {
    return [];
  }
}

/**
 * Create a simple session token (stored in localStorage on client)
 */
export function createSessionToken(telegramId: number): string {
  const payload = { telegram_id: telegramId, ts: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto
    .createHmac('sha256', process.env.JWT_SECRET!)
    .update(data)
    .digest('hex');
  return `${data}.${sig}`;
}

/**
 * Verify session token and return telegram_id
 */
export function verifySessionToken(token: string): number | null {
  try {
    const [data, sig] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', process.env.JWT_SECRET!)
      .update(data)
      .digest('hex');
    if (expectedSig !== sig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64').toString());

    // Token expires after 7 days
    if (Date.now() - payload.ts > 7 * 24 * 60 * 60 * 1000) return null;

    return payload.telegram_id;
  } catch {
    return null;
  }
}
