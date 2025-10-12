import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAccessToken, getFollowing, getCurrentUser } from "@/lib/x";

/**
 * GET /api/x/following
 * Get user's following list for @mention autocomplete
 *
 * Rate Limiting Strategy:
 * - X API allows 15 requests per 15 minutes per user
 * - Client should cache results in localStorage for 1 hour
 * - Default max_results: 100 (can be increased to 1000 if needed)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's X access token
    const accessToken = await getUserAccessToken(user.id);

    // Get current user info to retrieve their X user ID
    const currentUser = await getCurrentUser(accessToken);

    // Get following list
    const following = await getFollowing(accessToken, currentUser.id, 100);

    // Return with cache headers (1 hour)
    return NextResponse.json(
      { following },
      {
        headers: {
          "Cache-Control": "private, max-age=3600",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/x/following error:", error);

    // Handle specific X API errors
    if (error.message?.includes("X connection not found")) {
      return NextResponse.json(
        { error: "X account not connected" },
        { status: 404 }
      );
    }

    if (error.message?.includes("Failed to get following list")) {
      return NextResponse.json(
        { error: "Failed to fetch following list from X API" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get following list" },
      { status: 500 }
    );
  }
}
