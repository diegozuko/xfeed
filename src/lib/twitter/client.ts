import { TwitterApi } from "twitter-api-v2";
import { createServiceClient } from "@/lib/supabase/server";

export interface TwitterPost {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  hasMedia: boolean;
  hasLinks: boolean;
  urls: string[];
}

/**
 * Create an authenticated Twitter client for a user.
 * Handles token refresh automatically.
 */
export async function getTwitterClient(
  userId: string
): Promise<TwitterApi | null> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "x_access_token, x_refresh_token, x_token_expires_at, x_user_id"
    )
    .eq("id", userId)
    .single();

  if (!profile?.x_access_token) return null;

  // Check if token needs refresh
  const expiresAt = new Date(profile.x_token_expires_at);
  if (expiresAt < new Date()) {
    return await refreshTwitterToken(userId, profile.x_refresh_token);
  }

  return new TwitterApi(profile.x_access_token);
}

async function refreshTwitterToken(
  userId: string,
  refreshToken: string
): Promise<TwitterApi | null> {
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    const {
      accessToken,
      refreshToken: newRefresh,
      expiresIn,
    } = await client.refreshOAuth2Token(refreshToken);

    const supabase = createServiceClient();
    await supabase
      .from("profiles")
      .update({
        x_access_token: accessToken,
        x_refresh_token: newRefresh,
        x_token_expires_at: new Date(
          Date.now() + expiresIn * 1000
        ).toISOString(),
      })
      .eq("id", userId);

    return new TwitterApi(accessToken);
  } catch (error) {
    console.error("Failed to refresh Twitter token:", error);
    return null;
  }
}

/**
 * Fetch the user's home timeline.
 * Requires Twitter API Basic tier ($100/mo) or higher.
 *
 * FALLBACK: If home timeline is not available (Free tier),
 * we fetch tweets from specific accounts the user follows
 * using the user lookup + tweets endpoint instead.
 */
export async function fetchUserTimeline(
  userId: string,
  maxResults: number = 50
): Promise<TwitterPost[]> {
  const client = await getTwitterClient(userId);
  if (!client) throw new Error("Twitter not connected");

  try {
    // Try home timeline first (requires Basic tier)
    return await fetchHomeTimeline(client, maxResults);
  } catch (error: unknown) {
    const err = error as { code?: number };
    console.warn(
      "Home timeline not available, falling back to list-based fetch:",
      err.code
    );
    return await fetchFromFavoriteAccounts(userId, client, maxResults);
  }
}

async function fetchHomeTimeline(
  client: TwitterApi,
  maxResults: number
): Promise<TwitterPost[]> {
  const me = await client.v2.me();
  const timeline = await client.v2.homeTimeline({
    max_results: Math.min(maxResults, 100),
    "tweet.fields": [
      "created_at",
      "public_metrics",
      "entities",
      "attachments",
    ],
    "user.fields": ["username", "name"],
    expansions: ["author_id", "attachments.media_keys"],
  });

  const users = new Map(
    (timeline.includes?.users || []).map((u) => [
      u.id,
      { username: u.username, name: u.name },
    ])
  );

  return (timeline.data?.data || []).map((tweet) => {
    const author = users.get(tweet.author_id || "") || {
      username: "unknown",
      name: "Unknown",
    };
    const urls =
      tweet.entities?.urls?.map((u) => u.expanded_url || u.url) || [];

    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id || "",
      authorUsername: author.username,
      authorName: author.name,
      createdAt: tweet.created_at || new Date().toISOString(),
      likes: tweet.public_metrics?.like_count || 0,
      retweets: tweet.public_metrics?.retweet_count || 0,
      replies: tweet.public_metrics?.reply_count || 0,
      hasMedia: !!tweet.attachments?.media_keys?.length,
      hasLinks: urls.length > 0,
      urls,
    };
  });
}

/**
 * Fallback: fetch tweets from user's favorite accounts.
 * Works with lower API tiers.
 */
async function fetchFromFavoriteAccounts(
  userId: string,
  client: TwitterApi,
  maxResults: number
): Promise<TwitterPost[]> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("favorite_accounts")
    .eq("id", userId)
    .single();

  const accounts = profile?.favorite_accounts || [];
  if (accounts.length === 0) {
    throw new Error(
      "No favorite accounts configured. Add accounts in Settings to use the fallback feed mode."
    );
  }

  const allPosts: TwitterPost[] = [];
  const perAccount = Math.ceil(maxResults / accounts.length);

  for (const username of accounts.slice(0, 15)) {
    try {
      const user = await client.v2.userByUsername(username);
      if (!user.data) continue;

      const tweets = await client.v2.userTimeline(user.data.id, {
        max_results: Math.min(perAccount, 10),
        "tweet.fields": [
          "created_at",
          "public_metrics",
          "entities",
          "attachments",
        ],
      });

      for (const tweet of tweets.data?.data || []) {
        const urls =
          tweet.entities?.urls?.map((u) => u.expanded_url || u.url) || [];
        allPosts.push({
          id: tweet.id,
          text: tweet.text,
          authorId: user.data.id,
          authorUsername: username,
          authorName: user.data.name,
          createdAt: tweet.created_at || new Date().toISOString(),
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          hasMedia: !!tweet.attachments?.media_keys?.length,
          hasLinks: urls.length > 0,
          urls,
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch tweets for @${username}:`, error);
    }
  }

  return allPosts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
