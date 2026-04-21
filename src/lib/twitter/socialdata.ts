import { createServiceClient } from "@/lib/supabase/server";

export interface TwitterPost {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  hasMedia: boolean;
  hasLinks: boolean;
  urls: string[];
  postUrl: string;
  type: "tweet" | "reply" | "retweet";
}

interface SocialDataTweet {
  id_str: string;
  full_text: string;
  tweet_created_at: string;
  type: "tweet" | "reply" | "retweet";
  favorite_count: number;
  retweet_count: number;
  reply_count: number;
  views_count: number;
  user: {
    name: string;
    screen_name: string;
    profile_image_url_https: string;
  };
  entities?: {
    urls?: { expanded_url: string }[];
    media?: { type: string }[];
  };
}

interface SocialDataSearchResponse {
  tweets: SocialDataTweet[];
  next_cursor: string | null;
}

const SOCIALDATA_BASE = "https://api.socialdata.tools";

/**
 * Fetch tweets for multiple accounts using SocialData.tools API.
 * This is the primary fetcher — no Twitter API tier restrictions.
 * Costs ~$0.001 per request, much cheaper than Twitter API Basic.
 */
export async function fetchFeedViaSocialData(
  userId: string,
  maxPostsPerAccount: number = 10,
  maxPages: number = 3
): Promise<TwitterPost[]> {
  const apiKey = process.env.SOCIALDATA_API_KEY;
  if (!apiKey) {
    throw new Error("SOCIALDATA_API_KEY not configured");
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("favorite_accounts, ignored_accounts, x_username")
    .eq("id", userId)
    .single();

  const accounts = profile?.favorite_accounts || [];
  if (accounts.length === 0) {
    throw new Error(
      "No favorite accounts configured. Add accounts in Settings to generate your feed."
    );
  }

  const ignored = new Set(
    (profile?.ignored_accounts || []).map((a: string) => a.toLowerCase())
  );

  const allPosts: TwitterPost[] = [];

  for (const handle of accounts.slice(0, 25)) {
    if (ignored.has(handle.toLowerCase())) continue;

    try {
      const tweets = await fetchAccountTweets(apiKey, handle, maxPages);
      const filtered = tweets
        .filter((t) => t.type !== "retweet")
        .slice(0, maxPostsPerAccount);

      for (const tweet of filtered) {
        const urls =
          tweet.entities?.urls?.map((u) => u.expanded_url) || [];
        allPosts.push({
          id: tweet.id_str,
          text: tweet.full_text,
          authorId: tweet.user.screen_name,
          authorUsername: tweet.user.screen_name,
          authorName: tweet.user.name,
          authorAvatar: tweet.user.profile_image_url_https,
          createdAt: tweet.tweet_created_at,
          likes: tweet.favorite_count || 0,
          retweets: tweet.retweet_count || 0,
          replies: tweet.reply_count || 0,
          views: tweet.views_count || 0,
          hasMedia: !!tweet.entities?.media?.length,
          hasLinks: urls.length > 0,
          urls,
          postUrl: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
          type: tweet.type,
        });
      }

      // Rate limit courtesy
      await new Promise((r) => setTimeout(r, 300));
    } catch (error) {
      console.warn(`Failed to fetch tweets for @${handle}:`, error);
    }
  }

  return allPosts.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function fetchAccountTweets(
  apiKey: string,
  handle: string,
  maxPages: number
): Promise<SocialDataTweet[]> {
  const cleanHandle = handle.replace(/^@/, "");

  // Search for recent tweets from this account (last 48 hours)
  const now = Math.floor(Date.now() / 1000);
  const since = now - 48 * 60 * 60;
  const query = `from:${cleanHandle} since_time:${since} until_time:${now}`;

  const allTweets: SocialDataTweet[] = [];
  let cursor: string | null = null;
  let page = 0;

  while (page < maxPages) {
    const params = new URLSearchParams({ query, type: "Latest" });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(
      `${SOCIALDATA_BASE}/twitter/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 402)
        throw new Error("SocialData API: insufficient credits");
      if (response.status === 404)
        throw new Error(`Twitter user @${cleanHandle} not found`);
      throw new Error(`SocialData API error: ${response.status}`);
    }

    const data: SocialDataSearchResponse = await response.json();
    const tweets = data.tweets || [];
    if (tweets.length === 0) break;

    allTweets.push(...tweets);
    cursor = data.next_cursor;
    if (!cursor) break;

    page++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return allTweets;
}
