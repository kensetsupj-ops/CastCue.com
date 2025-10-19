import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, getAuthorizationUrl } from "@/lib/x";
import { randomBytes } from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * Start X OAuth flow
 * POST /api/x/oauth/start
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from Supabase session
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
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const codeVerifier = generateCodeVerifier();
    const state = randomBytes(16).toString("hex");

    const authUrl = await getAuthorizationUrl(state, codeVerifier);

    const response = NextResponse.json({ auth_url: authUrl });

    // Set cookies with httpOnly and sameSite=strict for CSRF protection
    response.cookies.set("oauth_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",  // SECURITY: Strict mode prevents CSRF
      maxAge: 600, // 10 minutes
    });

    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",  // SECURITY: Strict mode prevents CSRF
      maxAge: 600,
    });

    // Store user_id to associate with the OAuth flow
    response.cookies.set("oauth_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",  // SECURITY: Strict mode prevents CSRF
      maxAge: 600,
    });

    return response;
  } catch (error: any) {
    console.error("OAuth start error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
