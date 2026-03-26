import { TwitterApi } from "twitter-api-v2";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const storedVerifier = cookieStore.get("twitter_code_verifier")?.value;
  const storedState = cookieStore.get("twitter_state")?.value;

  if (!code || !storedVerifier || state !== storedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=twitter_auth`
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login`
    );
  }

  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;
    const { accessToken, refreshToken, expiresIn } =
      await client.loginWithOAuth2({
        code,
        codeVerifier: storedVerifier,
        redirectUri: callbackUrl,
      });

    // Get Twitter user info
    const twitterClient = new TwitterApi(accessToken);
    const me = await twitterClient.v2.me();

    // Save to profile
    await supabase
      .from("profiles")
      .update({
        x_user_id: me.data.id,
        x_username: me.data.username,
        x_access_token: accessToken,
        x_refresh_token: refreshToken,
        x_token_expires_at: new Date(
          Date.now() + expiresIn * 1000
        ).toISOString(),
      })
      .eq("id", user.id);

    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=twitter`
    );
    response.cookies.delete("twitter_code_verifier");
    response.cookies.delete("twitter_state");
    return response;
  } catch (error) {
    console.error("Twitter OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=twitter_auth`
    );
  }
}
