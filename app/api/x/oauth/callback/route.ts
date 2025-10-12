import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getCurrentUser } from "@/lib/x";
import { encrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/db";

/**
 * X OAuth callback
 * GET /api/x/oauth/callback
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.APP_ORIGIN}/integrations?error=missing_params`
      );
    }

    // Verify state
    const storedState = req.cookies.get("oauth_state")?.value;
    if (state !== storedState) {
      return NextResponse.redirect(
        `${process.env.APP_ORIGIN}/integrations?error=invalid_state`
      );
    }

    // Get code verifier
    const codeVerifier = req.cookies.get("oauth_code_verifier")?.value;
    if (!codeVerifier) {
      return NextResponse.redirect(
        `${process.env.APP_ORIGIN}/integrations?error=missing_verifier`
      );
    }

    // Exchange code for token
    const tokens = await exchangeCodeForToken(code, codeVerifier);

    // Get user info
    const userInfo = await getCurrentUser(tokens.access_token);

    // Get user_id from cookie (stored during OAuth start)
    const userId = req.cookies.get("oauth_user_id")?.value;
    if (!userId) {
      return NextResponse.redirect(
        `${process.env.APP_ORIGIN}/integrations?error=missing_user_id`
      );
    }

    // Store encrypted tokens
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabaseAdmin.from("x_connections").upsert({
      user_id: userId,
      scope: tokens.scope,
      access_token_cipher: encrypt(tokens.access_token),
      refresh_token_cipher: encrypt(tokens.refresh_token),
      expires_at: expiresAt.toISOString(),
    });

    // Clear cookies
    const response = NextResponse.redirect(
      `${process.env.APP_ORIGIN}/integrations?success=true`
    );

    response.cookies.delete("oauth_code_verifier");
    response.cookies.delete("oauth_state");
    response.cookies.delete("oauth_user_id");

    return response;
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.APP_ORIGIN}/integrations?error=${encodeURIComponent(error.message)}`
    );
  }
}
