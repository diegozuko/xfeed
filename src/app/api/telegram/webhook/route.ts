import { NextResponse } from "next/server";

/**
 * Telegram webhook handler.
 * When users send /start to the bot, it replies with their Chat ID
 * so they can enter it in XFeed settings.
 *
 * Set the webhook URL in Telegram via:
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-domain>/api/telegram/webhook
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.message) {
    return NextResponse.json({ ok: true });
  }

  const chatId = body.message.chat?.id;
  const text = body.message.text || "";
  const firstName = body.message.from?.first_name || "there";

  if (!chatId) return NextResponse.json({ ok: true });

  let reply = "";

  if (text === "/start") {
    reply =
      `Hey ${firstName}! Welcome to XFeed.\n\n` +
      `Your Chat ID is: <code>${chatId}</code>\n\n` +
      `Copy this ID and paste it in your XFeed settings to connect Telegram.`;
  } else if (text === "/id") {
    reply = `Your Chat ID is: <code>${chatId}</code>`;
  } else {
    reply =
      `Your Chat ID is: <code>${chatId}</code>\n\n` +
      `Use this in XFeed settings to connect your Telegram.`;
  }

  // Reply to the user
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        parse_mode: "HTML",
      }),
    }
  );

  return NextResponse.json({ ok: true });
}
