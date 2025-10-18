import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { sampleViewerCount } from "@/lib/sampling";

/**
 * Cron Job - Sample viewer counts for active streams
 *
 * This endpoint is called every 5 minutes by GitHub Actions (or Vercel Cron)
 * to sample viewer counts for all active streams.
 *
 * POST /api/cron/sampling (GitHub Actions)
 * GET /api/cron/sampling (Vercel Cron - legacy)
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 */
export async function POST(req: NextRequest) {
  return handleSampling(req);
}

export async function GET(req: NextRequest) {
  return handleSampling(req);
}

async function handleSampling(req: NextRequest) {
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

    console.log("[cron] Starting viewer sampling job");

    // Get all active streams (ended_at_est IS NULL means still live)
    const { data: activeStreams, error: streamsError } = await supabaseAdmin
      .from("streams")
      .select("id, user_id, stream_id, started_at")
      .is("ended_at_est", null);

    if (streamsError) {
      console.error("[cron] Failed to fetch active streams:", streamsError);
      throw streamsError;
    }

    if (!activeStreams || activeStreams.length === 0) {
      console.log("[cron] No active streams to sample");
      return NextResponse.json({
        success: true,
        message: "No active streams",
        sampled: 0,
      });
    }

    console.log(`[cron] Found ${activeStreams.length} active stream(s)`);

    // Sample viewer count for each stream
    const results = await Promise.allSettled(
      activeStreams.map(async (stream) => {
        try {
          const result = await sampleViewerCount(stream.id);

          if (!result) {
            console.log(`[cron] Stream ${stream.id} has ended or failed to sample`);
            return {
              stream_id: stream.id,
              status: "ended",
              viewer_count: null,
            };
          }

          console.log(
            `[cron] Sampled stream ${stream.id}: ${result.viewerCount} viewers`
          );

          return {
            stream_id: stream.id,
            status: "sampled",
            viewer_count: result.viewerCount,
          };
        } catch (error) {
          console.error(`[cron] Failed to sample stream ${stream.id}:`, error);
          throw error;
        }
      })
    );

    // Count successful and failed samples
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `[cron] Sampling complete: ${successful} successful, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      message: "Sampling complete",
      total: activeStreams.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        stream_id: activeStreams[i].id,
        status: r.status,
        result: r.status === "fulfilled" ? r.value : undefined,
        error: r.status === "rejected" ? String(r.reason) : undefined,
      })),
    });
  } catch (error: any) {
    console.error("[cron] Viewer sampling job error:", error);
    return NextResponse.json(
      {
        error: "Sampling job failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
