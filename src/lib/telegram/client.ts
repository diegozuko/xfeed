const TELEGRAM_API = "https://api.telegram.org/bot";

function getBotUrl(method: string): string {
  return `${TELEGRAM_API}${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

export async function sendTelegramMessage({
  chatId,
  text,
  parseMode = "HTML",
}: TelegramMessage): Promise<boolean> {
  const response = await fetch(getBotUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Telegram send error:", error);
    return false;
  }
  return true;
}

export async function sendTelegramAudio({
  chatId,
  audioUrl,
  caption,
  title,
}: {
  chatId: string;
  audioUrl: string;
  caption?: string;
  title?: string;
}): Promise<boolean> {
  const response = await fetch(getBotUrl("sendAudio"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      audio: audioUrl,
      caption,
      title: title || "XFeed Briefing",
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Telegram audio send error:", error);
    return false;
  }
  return true;
}

/**
 * Verify a chat ID by sending a test message.
 */
export async function verifyTelegramChat(chatId: string): Promise<boolean> {
  return sendTelegramMessage({
    chatId,
    text: "✅ <b>XFeed connected!</b>\n\nYou'll receive your feed briefings here.",
  });
}

/**
 * Format a briefing for Telegram delivery.
 */
export function formatBriefingForTelegram(briefing: {
  quickBrief: string;
  smartSummary?: string;
  audioUrl?: string;
}): string {
  let message = `⚡ <b>XFeed Briefing</b>\n\n`;
  message += briefing.quickBrief;

  if (briefing.smartSummary) {
    message += `\n\n━━━━━━━━━━━━\n\n`;
    message += `📋 <b>Full Summary</b>\n\n`;
    message += briefing.smartSummary;
  }

  if (briefing.audioUrl) {
    message += `\n\n🎧 <a href="${briefing.audioUrl}">Listen to audio briefing</a>`;
  }

  return message;
}
