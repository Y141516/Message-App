import crypto from 'crypto';

export function validateTelegramInitData(initData: string): boolean {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Also validate auth_date is not older than 24 hours
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return false;

    return expectedHash === hash;
  } catch {
    return false;
  }
}

export function parseTelegramUser(initData: string) {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
  
  return res.json();
}

export async function checkUserGroupMembership(
  telegramUserId: string,
  groupIds: string[]
): Promise<string[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const memberGroups: string[] = [];

  for (const groupId of groupIds) {
    try {
      const url = `https://api.telegram.org/bot${token}/getChatMember`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: groupId, user_id: telegramUserId }),
      });
      const data = await res.json();
      
      if (data.ok && ['member', 'administrator', 'creator'].includes(data.result?.status)) {
        memberGroups.push(groupId);
      }
    } catch {
      // Group check failed, skip
    }
  }

  return memberGroups;
}
