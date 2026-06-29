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

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return false;

    return expectedHash === hash;
  } catch { return false; }
}

export function parseTelegramUser(initData: string) {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch { return null; }
}

/**
 * Escapes text for Telegram HTML parse mode.
 * Only <, >, & need escaping in HTML mode.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Send a Telegram message using HTML parse_mode.
 * Supports: <b>bold</b>, <i>italic</i>, <u>underline</u>, <a href="...">link</a>
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options: { disablePreview?: boolean } = {}
): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: options.disablePreview ?? true,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error(`[Telegram] sendMessage failed to ${chatId}:`, data.description);
  }
  return data;
}

/**
 * Pre-built HTML message templates — properly formatted for Telegram HTML mode.
 */
export const TelegramMessages = {
  queueOpened: (leaderName: string, limit: number) =>
    `🟢 <b>Queue Opened!</b>\n\n<b>${escapeHtml(leaderName)} ji</b> has opened the queue for <b>${limit} messages</b>.\n\nOpen the app now to send your message! 🙏`,

  queueClosed: (leaderName: string, totalReceived: number) =>
    `🔴 <b>Queue Closed</b>\n\n<b>${escapeHtml(leaderName)} ji's</b> queue is now closed.\n\n<b>${totalReceived}</b> messages were received. You will receive a reply soon. 🙏`,

  queueAutoClose: (limit: number, received: number) =>
    `✅ <b>Queue Auto-Closed</b>\n\nYour queue reached the limit of <b>${limit}</b> messages.\n\nTotal received: <b>${received}</b>\n\nOpen the app to start replying. 🙏`,

  queueSummary: (leaderName: string, received: number, limit: number) =>
    `📊 <b>Queue Summary — ${escapeHtml(leaderName)} ji</b>\n\nMessages received: <b>${received}</b> / ${limit}\n\nOpen the app to start replying. 🙏`,

  replyReceived: (leaderName: string, preview?: string) =>
    `🔔 <b>Reply Received!</b>\n\nYou have received a reply from <b>${escapeHtml(leaderName)} ji</b>.\n\n${preview ? `<i>"${escapeHtml(preview.slice(0, 120))}${preview.length > 120 ? '...' : ''}"</i>\n\n` : ''}Open the app to view. 🙏`,

  audioReplyReceived: (leaderName: string) =>
    `🔔 <b>Reply Received!</b>\n\nYou have received an <b>audio reply</b> from <b>${escapeHtml(leaderName)} ji</b>.\n\nOpen the app to listen. 🙏`,

  emergencyReceived: (type: string, userName: string, content?: string, hasVoice?: boolean) =>
    `${type}\n\n<b>From:</b> ${escapeHtml(userName)}\n${content ? `<i>"${escapeHtml(content.slice(0, 150))}"</i>\n` : ''}${hasVoice ? '🎤 <i>Voice note attached</i>\n' : ''}\nOpen the app to reply immediately.`,

  announcement: (senderName: string, title: string, body: string) =>
    `📢 <b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}\n\n<i>— ${escapeHtml(senderName)}</i>`,

  userNotInQueue: (leaderName: string) =>
    `🔴 <b>Queue Closed</b>\n\n<b>${escapeHtml(leaderName)} ji's</b> queue is now full.\n\nYou will receive a reply soon. 🙏`,
};

export async function checkUserGroupMembership(
  telegramUserId: string,
  groupIds: string[]
): Promise<string[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const memberGroups: string[] = [];

  for (const groupId of groupIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: groupId, user_id: telegramUserId }),
      });
      const data = await res.json();
      if (data.ok && ['member', 'administrator', 'creator'].includes(data.result?.status)) {
        memberGroups.push(groupId);
      }
    } catch {}
  }
  return memberGroups;
}
