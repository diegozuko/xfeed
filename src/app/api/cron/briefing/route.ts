import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchFeedViaSocialData } from "@/lib/twitter/socialdata";
import { generateBriefing, generateAudioScript } from "@/lib/ai/summarizer";
import { generateAndStoreAudio } from "@/lib/ai/tts";
import {
  sendTelegramMessage,
  sendTelegramAudio,
  formatBriefingForTelegram,
} from "@/lib/telegram/client";

export const maxDuration = 120;

/**
 * Cron job to generate and send briefings for users
 * with auto_send_telegram enabled.
 *
 * Configure in vercel.json:
 * { "crons": [{ "path": "/api/cron/briefing", "schedule": "0 8,20 * * *" }] }
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get users with auto-send enabled
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("auto_send_telegram", true)
    .eq("telegram_connected", true)
    .not("favorite_accounts", "eq", "{}");

  if (!users || users.length === 0) {
    return NextResponse.json({ message: "No users to process" });
  }

  const results = [];

  for (const profile of users) {
    try {
      const postsToFetch = Math.min(profile.posts_to_analyze || 50, 150);
      const posts = await fetchFeedViaSocialData(
        profile.id,
        postsToFetch
      );

      // Generate briefing
      const content = await generateBriefing(posts, {
        language: profile.preferred_language,
        tone: profile.summary_tone,
        priorityTopics: profile.priority_topics,
      });

      // Generate audio
      const scripts = await generateAudioScript(content, {
        language: profile.preferred_language,
        tone: profile.summary_tone,
      });

      // Create briefing record
      const { data: briefing } = await supabase
        .from("briefings")
        .insert({
          user_id: profile.id,
          quick_brief: content.quickBrief,
          smart_summary: content.smartSummary,
          deep_dive: content.deepDive,
          posts_analyzed: posts.length,
          topics: content.topics,
          top_accounts: content.topAccounts,
          audio_script: scripts.flashScript,
          status: "ready",
        })
        .select()
        .single();

      if (briefing) {
        // Generate and store audio
        const { url, durationEstimate } = await generateAndStoreAudio(
          scripts.flashScript,
          briefing.id,
          "flash"
        );

        await supabase
          .from("briefings")
          .update({
            audio_url: url,
            audio_duration_seconds: durationEstimate,
          })
          .eq("id", briefing.id);

        // Send to Telegram
        await sendTelegramMessage({
          chatId: profile.telegram_chat_id,
          text: formatBriefingForTelegram({
            quickBrief: content.quickBrief,
            smartSummary: content.smartSummary,
            audioUrl: url,
          }),
        });

        if (url) {
          await sendTelegramAudio({
            chatId: profile.telegram_chat_id,
            audioUrl: url,
            caption: "🎧 XFeed Audio Briefing",
          });
        }

        await supabase
          .from("briefings")
          .update({
            sent_to_telegram: true,
            sent_at: new Date().toISOString(),
          })
          .eq("id", briefing.id);

        results.push({ userId: profile.id, status: "sent" });
      }
    } catch (error) {
      console.error(`Cron error for user ${profile.id}:`, error);
      results.push({
        userId: profile.id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
