import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sampleViewerCount } from "@/lib/sampling";
import { supabaseAdmin } from "@/lib/db";

const SampleRequestSchema = z.object({
  stream_id: z.number().int().positive(),
});

/**
 * Sample viewer count for a stream
 * POST /api/sampling
 *
 * This endpoint can be called manually or by a cron job to sample viewer counts
 */
export async function POST(req: NextRequest) {
  try {
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
 * This endpoint can be called by a cron job to sample all active streams
 */
export async function GET(req: NextRequest) {
  try {
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
