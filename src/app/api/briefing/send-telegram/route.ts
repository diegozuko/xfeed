import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";
import {
  sendTelegramMessage,
  sendTelegramAudio,
  formatBriefingForTelegram,
} from "@/lib/telegram/client";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { briefingId } = await request.json();
  if (!briefingId) {
    return NextResponse.json(
      { error: "briefingId required" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  // Get profile with telegram info
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("telegram_chat_id, telegram_connected")
    .eq("id", user.id)
    .single();

  if (!profile?.telegram_connected || !profile.telegram_chat_id) {
    return NextResponse.json(
      { error: "Telegram not connected" },
      { status: 400 }
    );
  }

  // Get briefing
  const { data: briefing } = await serviceClient
    .from("briefings")
    .select("*")
    .eq("id", briefingId)
    .eq("user_id", user.id)
    .single();

  if (!briefing) {
    return NextResponse.json(
      { error: "Briefing not found" },
      { status: 404 }
    );
  }

  // Send text message
  const textSent = await sendTelegramMessage({
    chatId: profile.telegram_chat_id,
    text: formatBriefingForTelegram({
      quickBrief: briefing.quick_brief,
      smartSummary: briefing.smart_summary,
      audioUrl: briefing.audio_url,
    }),
  });

  // Send audio if available
  if (briefing.audio_url) {
    await sendTelegramAudio({
      chatId: profile.telegram_chat_id,
      audioUrl: briefing.audio_url,
      caption: "🎧 XFeed Audio Briefing",
      title: `XFeed Briefing - ${new Date().toLocaleDateString()}`,
    });
  }

  if (textSent) {
    await serviceClient
      .from("briefings")
      .update({ sent_to_telegram: true, sent_at: new Date().toISOString() })
      .eq("id", briefingId);
  }

  return NextResponse.json({ success: textSent });
}
