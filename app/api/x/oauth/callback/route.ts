import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getCurrentUser } from "@/lib/x";
import { encrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/db";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * X OAuth callback
 * GET /api/x/oauth/callback
 *
 * SECURITY: Re-authenticates user to prevent OAuth state hijacking
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

    // SECURITY FIX: Re-authenticate user to prevent OAuth state hijacking
    // Do NOT trust oauth_user_id cookie alone - validate against current session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        `${process.env.APP_ORIGIN}/integrations?error=authentication_required`
      );
    }

    // Get user_id from cookie (stored during OAuth start)
    const cookieUserId = req.cookies.get("oauth_user_id")?.value;

    // SECURITY: Verify cookie user_id matches authenticated user
    if (!cookieUserId || cookieUserId !== user.id) {
      console.error("OAuth security violation: user_id mismatch", {
        cookieUserId,
        authenticatedUserId: user.id,
      });
      return NextResponse.redirect(
        `${process.env.APP_ORIGIN}/integrations?error=security_violation`
      );
    }

    // Exchange code for token
    const tokens = await exchangeCodeForToken(code, codeVerifier);

    // Get user info
    const userInfo = await getCurrentUser(tokens.access_token);

    // Store encrypted tokens (use authenticated user.id, not cookie)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabaseAdmin.from("x_connections").upsert({
      user_id: user.id,  // Use authenticated user ID
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
