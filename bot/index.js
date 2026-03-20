/**
 * TELEGRAM BOT
 * Run: node bot/index.js
 * Env vars: TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL
 */
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const name = msg.from?.first_name || 'friend';
  bot.sendMessage(msg.chat.id,
    `Jay Bhagwanji, ${name}!\n\nTap below to open the Messenger App.`,
    { reply_markup: { inline_keyboard: [[{ text: '🌸 Open App', web_app: { url: APP_URL } }]] } }
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `How to use:\n1. Click Open App\n2. Send messages when queue is open\n3. Use Emergency for urgent needs\n4. See replies in Dashboard`
  );
});

console.log('Bot running...');
