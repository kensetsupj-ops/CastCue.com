import { NextRequest, NextResponse } from "next/server";
import { getQuota } from "@/lib/quota";

/**
 * Get quota information
 * GET /api/quota?user_id=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const quota = await getQuota(userId);

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
