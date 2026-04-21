import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceClient,
} from "@/lib/supabase/server";

/**
 * Curated list of high-signal accounts across categories.
 * These are always shown as suggestions regardless of timeline data.
 */
const CURATED_ACCOUNTS: {
  username: string;
  name: string;
  category: string;
}[] = [
  // Tech & Business leaders
  { username: "elonmusk", name: "Elon Musk", category: "tech" },
  { username: "sataborella", name: "Satya Nadella", category: "tech" },
  { username: "BillGates", name: "Bill Gates", category: "tech" },
  { username: "timcook", name: "Tim Cook", category: "tech" },
  { username: "sundaborella", name: "Sundar Pichai", category: "tech" },
  { username: "JeffBezos", name: "Jeff Bezos", category: "business" },
  // AI & Tech
  { username: "sama", name: "Sam Altman", category: "AI" },
  { username: "DarioAmodei", name: "Dario Amodei", category: "AI" },
  { username: "ylecun", name: "Yann LeCun", category: "AI" },
  { username: "AndrewYNg", name: "Andrew Ng", category: "AI" },
  { username: "karpathy", name: "Andrej Karpathy", category: "AI" },
  // Crypto & Finance
  { username: "CathieDWood", name: "Cathie Wood", category: "markets" },
  { username: "michael_saylor", name: "Michael Saylor", category: "crypto" },
  { username: "VitalikButerin", name: "Vitalik Buterin", category: "crypto" },
  // News & Media
  { username: "WSJ", name: "Wall Street Journal", category: "markets" },
  { username: "Reuters", name: "Reuters", category: "politics" },
  { username: "BBCBreaking", name: "BBC Breaking", category: "politics" },
  { username: "BloombergTV", name: "Bloomberg TV", category: "markets" },
  // Startups & VC
  { username: "pmarca", name: "Marc Andreessen", category: "startups" },
  { username: "paulg", name: "Paul Graham", category: "startups" },
  { username: "naval", name: "Naval", category: "startups" },
  // Science
  { username: "NASA", name: "NASA", category: "science" },
  { username: "SpaceX", name: "SpaceX", category: "science" },
  // Sports
  { username: "ESPNfc", name: "ESPN FC", category: "sports" },
];

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get user's current favorite accounts to exclude them
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("favorite_accounts, priority_topics")
    .eq("id", user.id)
    .single();

  const existingFavorites = new Set(
    (profile?.favorite_accounts || []).map((a: string) => a.toLowerCase())
  );
  const userTopics = profile?.priority_topics || [];

  // Analyze cached posts to find high-signal accounts from the user's timeline
  const { data: cachedPosts } = await serviceClient
    .from("cached_posts")
    .select("author_username, author_name, likes, retweets, replies, text")
    .eq("user_id", user.id)
    .order("fetched_at", { ascending: false })
    .limit(500);

  // Build account scores from timeline data
  const accountMap = new Map<
    string,
    {
      username: string;
      name: string;
      postCount: number;
      totalLikes: number;
      totalRetweets: number;
      totalReplies: number;
      avgEngagement: number;
    }
  >();

  for (const post of cachedPosts || []) {
    const key = post.author_username?.toLowerCase();
    if (!key) continue;

    const existing = accountMap.get(key);
    if (existing) {
      existing.postCount++;
      existing.totalLikes += post.likes || 0;
      existing.totalRetweets += post.retweets || 0;
      existing.totalReplies += post.replies || 0;
    } else {
      accountMap.set(key, {
        username: post.author_username,
        name: post.author_name || post.author_username,
        postCount: 1,
        totalLikes: post.likes || 0,
        totalRetweets: post.retweets || 0,
        totalReplies: post.replies || 0,
        avgEngagement: 0,
      });
    }
  }

  // Score timeline accounts
  const timelineSuggestions = Array.from(accountMap.values())
    .map((acc) => {
      const totalEngagement =
        acc.totalLikes + acc.totalRetweets * 2 + acc.totalReplies;
      acc.avgEngagement =
        acc.postCount > 0 ? totalEngagement / acc.postCount : 0;

      const score =
        Math.log1p(acc.avgEngagement) * 3 +
        Math.log1p(acc.postCount) * 5 +
        Math.log1p(acc.totalRetweets) * 2;

      return {
        username: acc.username,
        name: acc.name,
        reason: `${acc.postCount} posts, avg ${Math.round(acc.avgEngagement)} engagement`,
        score,
        source: "timeline" as const,
      };
    })
    .filter((a) => !existingFavorites.has(a.username.toLowerCase()))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  // Filter curated accounts: exclude existing favorites, boost by topic match
  const curatedSuggestions = CURATED_ACCOUNTS.filter(
    (a) => !existingFavorites.has(a.username.toLowerCase())
  )
    .map((a) => ({
      username: a.username,
      name: a.name,
      reason: a.category,
      score: userTopics.includes(a.category) ? 100 : 50,
      source: "curated" as const,
    }))
    .sort((a, b) => b.score - a.score);

  // Merge: timeline accounts first, then curated (deduped)
  const seen = new Set<string>();
  const merged: Array<{
    username: string;
    name: string;
    reason: string;
    score: number;
    source: "timeline" | "curated";
  }> = [];

  for (const s of timelineSuggestions) {
    const key = s.username.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }
  for (const s of curatedSuggestions) {
    const key = s.username.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }

  return NextResponse.json({
    suggestions: merged.slice(0, 20),
    hasTimelineData: (cachedPosts || []).length > 0,
  });
}
