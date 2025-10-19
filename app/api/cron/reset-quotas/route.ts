import { NextRequest, NextResponse } from "next/server";
import { resetMonthlyQuotas } from "@/lib/quota";

// Force dynamic rendering (uses request.headers)
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Job - Reset monthly quotas
 *
 * This endpoint is called on the 1st day of each month at 00:00 UTC
 * to reset all users' monthly quota usage counters.
 *
 * GET /api/cron/reset-quotas
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[cron] CRON_SECRET environment variable not configured");
      return NextResponse.json(
        { error: "Cron job not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[cron] Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[cron] Starting monthly quota reset job");

    // Reset all quotas for users whose reset_on date has passed
    await resetMonthlyQuotas();

    console.log("[cron] Monthly quota reset complete");

    return NextResponse.json({
      success: true,
      message: "Monthly quotas reset successfully",
      reset_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[cron] Monthly quota reset job error:", error);
    return NextResponse.json(
      {
        error: "Quota reset failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
