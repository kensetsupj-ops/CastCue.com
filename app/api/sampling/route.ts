import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sampleViewerCount } from "@/lib/sampling";
import { supabaseAdmin } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/ratelimit";

const SampleRequestSchema = z.object({
  stream_id: z.number().int().positive(),
});

/**
 * SECURITY: Verify cron secret using constant-time comparison
 * Prevents timing attacks to guess the secret
 */
function verifyCronSecret(providedSecret: string | null): boolean {
  if (!providedSecret || !process.env.CRON_SECRET) {
    return false;
  }

  try {
    const providedBuffer = Buffer.from(providedSecret, "utf8");
    const expectedBuffer = Buffer.from(process.env.CRON_SECRET, "utf8");

    // SECURITY: Length check before constant-time comparison
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Sample viewer count for a stream
 * POST /api/sampling
 *
 * SECURITY: Requires authentication or valid cron secret
 * This endpoint can be called by authenticated users or by a cron job with secret
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Check for cron secret (for automated jobs) with constant-time comparison
    const cronSecret = req.headers.get("x-cron-secret");
    const isValidCron = verifyCronSecret(cronSecret);

    // SECURITY: If not from cron, require authentication
    if (!isValidCron) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // SECURITY: Rate limiting for authenticated users - 10 requests per minute
      const rateLimitError = await checkRateLimit(req, user.id, {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 requests per minute
      });
      if (rateLimitError) {
        return rateLimitError;
      }
    }

    const body = await req.json();
    const { stream_id } = SampleRequestSchema.parse(body);

    const result = await sampleViewerCount(stream_id);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to sample stream or stream is no longer live" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sample_id: result.sampleId,
      viewer_count: result.viewerCount,
    });
  } catch (error: any) {
    console.error("Sampling error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Sample all active streams
 * GET /api/sampling
 *
 * SECURITY: Requires authentication or valid cron secret
 * This endpoint can be called by authenticated users or by a cron job with secret
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Check for cron secret (for automated jobs) with constant-time comparison
    const cronSecret = req.headers.get("x-cron-secret");
    const isValidCron = verifyCronSecret(cronSecret);

    // SECURITY: If not from cron, require authentication
    if (!isValidCron) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // SECURITY: Rate limiting for authenticated users - 10 requests per minute
      const rateLimitError = await checkRateLimit(req, user.id, {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 requests per minute
      });
      if (rateLimitError) {
        return rateLimitError;
      }
    }

    // Get all active streams (streams without ended_at_est)
    const { data: activeStreams } = await supabaseAdmin
      .from("streams")
      .select("id, stream_id, started_at")
      .is("ended_at_est", null)
      .order("started_at", { ascending: false });

    if (!activeStreams || activeStreams.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active streams to sample",
        sampled: 0,
      });
    }

    // Sample each active stream
    const results = await Promise.all(
      activeStreams.map((stream) => sampleViewerCount(stream.id))
    );

    const successful = results.filter((r) => r !== null).length;

    return NextResponse.json({
      success: true,
      total_streams: activeStreams.length,
      sampled: successful,
    });
  } catch (error: any) {
    console.error("Batch sampling error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
