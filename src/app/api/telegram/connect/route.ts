import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";
import { verifyTelegramChat } from "@/lib/telegram/client";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId, username } = await request.json();
  if (!chatId) {
    return NextResponse.json(
      { error: "chatId is required" },
      { status: 400 }
    );
  }

  // Verify by sending a test message
  const verified = await verifyTelegramChat(chatId);
  if (!verified) {
    return NextResponse.json(
      {
        error:
          "Could not send message to this chat ID. Make sure you've started a conversation with the bot first.",
      },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();
  await serviceClient
    .from("profiles")
    .update({
      telegram_chat_id: chatId,
      telegram_username: username || null,
      telegram_connected: true,
    })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
