// ============================================================
// TELEGRAM BOT - Notification & Group Management
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function telegramRequest(method: string, params: Record<string, unknown>) {
  try {
    const res = await fetch(`${BASE_URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API error [${method}]:`, err);
    return { ok: false };
  }
}

/**
 * Send a text message to a Telegram user
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown';
    reply_markup?: unknown;
  }
) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode || 'HTML',
    reply_markup: options?.reply_markup,
  });
}

/**
 * Notify all users in the system that a queue has opened
 * Called when a leader opens their queue
 */
export async function notifyQueueOpened(
  leaderDisplayName: string,
  messageLimit: number,
  userTelegramIds: number[],
  appUrl: string
) {
  const text = `
🟢 <b>Queue Opened!</b>

<b>${leaderDisplayName}</b> ji has opened queue for <b>${messageLimit}</b> messages.

Tap below to open the app and send your message!
  `.trim();

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '📱 Open Messenger App',
          web_app: { url: appUrl },
        },
      ],
    ],
  };

  // Send to all users (in batches to avoid rate limits)
  const batchSize = 25;
  for (let i = 0; i < userTelegramIds.length; i += batchSize) {
    const batch = userTelegramIds.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map((id) => sendTelegramMessage(id, text, { reply_markup: keyboard }))
    );
    // Small delay between batches
    if (i + batchSize < userTelegramIds.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

/**
 * Notify a specific user that they received a reply
 */
export async function notifyReplyReceived(
  userTelegramId: number,
  leaderDisplayName: string,
  appUrl: string
) {
  const text = `
💬 <b>You have a new reply!</b>

<b>${leaderDisplayName}</b> ji has replied to your message.

Tap below to view the reply.
  `.trim();

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '📱 View Reply',
          web_app: { url: `${appUrl}/dashboard` },
        },
      ],
    ],
  };

  return sendTelegramMessage(userTelegramId, text, { reply_markup: keyboard });
}

/**
 * Notify a user their emergency message was received
 */
export async function notifyEmergencyAck(
  userTelegramId: number,
  leaderDisplayName: string
) {
  const text = `
🚨 <b>Emergency Message Received</b>

Your emergency message has been sent to <b>${leaderDisplayName}</b> ji.

You will be notified when they reply.
  `.trim();

  return sendTelegramMessage(userTelegramId, text);
}

/**
 * Set up the bot webhook (called once during deployment)
 */
export async function setWebhook(webhookUrl: string) {
  return telegramRequest('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query', 'chat_member'],
  });
}

/**
 * Set bot commands menu
 */
export async function setBotCommands() {
  return telegramRequest('setMyCommands', {
    commands: [
      { command: 'start', description: 'Open Messenger App' },
      { command: 'help', description: 'Get help' },
      { command: 'status', description: 'Check queue status' },
    ],
  });
}
