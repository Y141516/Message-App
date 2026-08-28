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
 * Broadcasts one message to many Telegram users as fast as Telegram's Bot
 * API safely allows (~28 msgs/sec — just under Telegram's documented ~30/sec
 * global rate limit), instead of a flat "25 at a time, then sleep exactly
 * 1 full second" pattern that wastes time waiting even when the batch itself
 * already took a while.
 *
 * This matters a lot for something like "queue just opened" — for a few
 * thousand recipients this can still take well over a minute in total
 * because Telegram itself won't accept messages faster than that, no matter
 * how the code is written. This just makes sure none of that time is wasted
 * beyond what Telegram actually requires, and that a 429 (rate limited)
 * response backs off and retries instead of silently dropping that user.
 */
export async function broadcastToTelegramUsers(
  telegramIds: string[],
  text: string,
  opts: { batchSize?: number; targetMsgsPerSec?: number } = {}
): Promise<{ sent: number; failed: number }> {
  const batchSize = opts.batchSize ?? 28;
  const targetMsgsPerSec = opts.targetMsgsPerSec ?? 28;
  const minBatchDurationMs = (batchSize / targetMsgsPerSec) * 1000;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < telegramIds.length; i += batchSize) {
    const batch = telegramIds.slice(i, i + batchSize);
    const batchStart = Date.now();

    const results = await Promise.allSettled(
      batch.map(id => sendWithRetry(id, text))
    );
    results.forEach(r => { if (r.status === 'fulfilled' && r.value) sent++; else failed++; });

    // Only wait out whatever's left of the target pace — if the network
    // calls themselves already took the full budget, don't add extra delay.
    const elapsed = Date.now() - batchStart;
    const remaining = minBatchDurationMs - elapsed;
    if (remaining > 0 && i + batchSize < telegramIds.length) {
      await new Promise(r => setTimeout(r, remaining));
    }
  }

  return { sent, failed };
}

async function sendWithRetry(chatId: string, text: string, retriesLeft = 2): Promise<boolean> {
  const data = await sendTelegramMessage(chatId, text);
  if (data?.ok) return true;

  // Telegram returned 429 — respect retry_after and try again once or twice
  if (data?.error_code === 429 && retriesLeft > 0) {
    const retryAfterSec = data?.parameters?.retry_after ?? 1;
    await new Promise(r => setTimeout(r, retryAfterSec * 1000));
    return sendWithRetry(chatId, text, retriesLeft - 1);
  }

  return false;
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
