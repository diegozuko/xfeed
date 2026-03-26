import { TwitterApi } from "twitter-api-v2";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Initiate Twitter OAuth 2.0 PKCE flow.
 * Redirects user to Twitter authorization page.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    callbackUrl,
    {
      scope: [
        "tweet.read",
        "users.read",
        "follows.read",
        "list.read",
        "offline.access",
      ],
    }
  );

  // Store verifier in cookie for callback
  const response = NextResponse.redirect(url);
  response.cookies.set("twitter_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });
  response.cookies.set("twitter_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  });

  return response;
}
