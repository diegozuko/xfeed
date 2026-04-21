import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceClient,
} from "@/lib/supabase/server";
import { fetchFeedViaSocialData } from "@/lib/twitter/socialdata";
import { fetchUserTimeline } from "@/lib/twitter/client";
import { generateBriefing, generateAudioScript } from "@/lib/ai/summarizer";
import { generateAndStoreAudio } from "@/lib/ai/tts";
import type { TwitterPost } from "@/lib/twitter/socialdata";

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const includeAudio = body.includeAudio !== false;
  const audioFormat = body.audioFormat || "flash";

  try {
    const serviceClient = createServiceClient();

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: briefing, error: insertError } = await serviceClient
      .from("briefings")
      .insert({
        user_id: user.id,
        status: "generating",
        audio_format: audioFormat,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Fetch posts: try SocialData first, fallback to Twitter API
    let posts: TwitterPost[];
    try {
      posts = await fetchFeedViaSocialData(
        user.id,
        profile?.posts_to_analyze || 50
      );
    } catch (sdError) {
      console.warn("SocialData fetch failed, trying Twitter API:", sdError);
      const legacyPosts = await fetchUserTimeline(
        user.id,
        profile?.posts_to_analyze || 50
      );
      posts = legacyPosts.map((p) => ({
        ...p,
        authorAvatar: "",
        views: 0,
        postUrl: `https://x.com/${p.authorUsername}/status/${p.id}`,
        type: "tweet" as const,
      }));
    }

    // Cache posts
    for (const post of posts) {
      await serviceClient.from("cached_posts").upsert(
        {
          user_id: user.id,
          tweet_id: post.id,
          author_id: post.authorId,
          author_username: post.authorUsername,
          author_name: post.authorName,
          text: post.text,
          created_at_twitter: post.createdAt,
          likes: post.likes,
          retweets: post.retweets,
          replies: post.replies,
          has_media: post.hasMedia,
          has_links: post.hasLinks,
          urls: post.urls,
        },
        { onConflict: "user_id,tweet_id" }
      );
    }

    // Generate briefing with batch insight extraction
    const content = await generateBriefing(posts, {
      language: profile?.preferred_language || "es",
      tone: profile?.summary_tone || "professional",
      priorityTopics: profile?.priority_topics || [],
    });

    const updateData: Record<string, unknown> = {
      quick_brief: content.quickBrief,
      smart_summary: content.smartSummary,
      deep_dive: content.deepDive,
      posts_analyzed: posts.length,
      topics: content.topics,
      top_accounts: content.topAccounts,
      status: "ready",
    };

    if (includeAudio) {
      const scripts = await generateAudioScript(content, {
        language: profile?.preferred_language || "es",
        tone: profile?.summary_tone || "professional",
      });

      const scriptToUse =
        audioFormat === "podcast"
          ? scripts.podcastScript
          : scripts.flashScript;
      const { url, durationEstimate } = await generateAndStoreAudio(
        scriptToUse,
        briefing.id,
        audioFormat
      );

      updateData.audio_script = scriptToUse;
      updateData.audio_url = url;
      updateData.audio_duration_seconds = durationEstimate;
    }

    await serviceClient
      .from("briefings")
      .update(updateData)
      .eq("id", briefing.id);

    return NextResponse.json({ id: briefing.id, ...updateData });
  } catch (error: unknown) {
    console.error("Briefing generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 }
    );
  }
}
