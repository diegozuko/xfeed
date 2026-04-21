import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // No Resend configured — let the client fall back to Supabase built-in
    return NextResponse.json(
      { error: "Custom email not configured" },
      { status: 501 }
    );
  }

  try {
    // Generate a magic link via Supabase Admin API
    const supabase = createServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error || !data?.properties?.hashed_token) {
      console.error("Supabase generateLink error:", error);
      return NextResponse.json(
        { error: "Failed to generate link" },
        { status: 500 }
      );
    }

    // Build the magic link URL using the hashed token
    const callbackUrl = new URL(
      "/auth/callback",
      process.env.NEXT_PUBLIC_APP_URL
    );
    callbackUrl.searchParams.set(
      "token_hash",
      data.properties.hashed_token
    );
    callbackUrl.searchParams.set("type", "magiclink");
    callbackUrl.searchParams.set("next", "/dashboard");

    const magicLinkUrl = callbackUrl.toString();

    // Send via Resend — no rate limits
    const resend = new Resend(resendKey);
    const fromEmail = process.env.EMAIL_FROM || "XFeed <noreply@xfeed.app>";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Sign in to XFeed",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #fafafa; margin: 0;">⚡ XFeed</h1>
          </div>
          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; text-align: center;">
            <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px 0;">
              Click the button below to sign in to your XFeed account.
            </p>
            <a href="${magicLinkUrl}"
               style="display: inline-block; background: #6366f1; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
              Sign in to XFeed
            </a>
            <p style="color: #71717a; font-size: 12px; margin: 24px 0 0 0;">
              This link expires in 1 hour. If you didn't request this, ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Magic link email error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
