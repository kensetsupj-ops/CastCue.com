import { NextRequest, NextResponse } from "next/server";
import { getQuota } from "@/lib/quota";
import { createClient } from "@/lib/supabase/server";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * Get quota information
 * GET /api/quota
 *
 * SECURITY: Requires authentication
 * Returns quota information for the authenticated user only
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Only allow users to view their own quota
    const quota = await getQuota(user.id);

    return NextResponse.json({
      user_remaining: quota.user_remaining,
      global_remaining: quota.global_remaining,
      user_used: quota.user_used,
      user_limit: quota.user_limit,
      global_used: quota.global_used,
      global_limit: quota.global_limit,
      reset_at: quota.reset_on,
      can_post: quota.can_post,
      warning_level: quota.warning_level,
    });
  } catch (error: any) {
    console.error("Quota error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
