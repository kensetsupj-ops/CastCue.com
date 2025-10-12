import { supabaseAdmin } from "./db";
import { TwitchClient } from "./twitch";

/**
 * Sample viewer count for an active stream
 */
export async function sampleViewerCount(streamId: number): Promise<{
  sampleId: number;
  viewerCount: number;
} | null> {
  try {
    // Get stream info
    const { data: stream } = await supabaseAdmin
      .from("streams")
      .select("*")
      .eq("id", streamId)
      .single();

    if (!stream) {
      console.error(`[sampling] Stream ${streamId} not found`);
      return null;
    }

    // Get current viewer count from Twitch API
    const twitchClient = new TwitchClient();
    const streamInfo = await twitchClient.getStream(stream.stream_id);

    if (!streamInfo) {
      console.log(`[sampling] Stream ${stream.stream_id} is no longer live`);
      // Stream ended - update ended_at_est if not set
      if (!stream.ended_at_est) {
        await supabaseAdmin
          .from("streams")
          .update({ ended_at_est: new Date().toISOString() })
          .eq("id", streamId);
      }
      return null;
    }

    const viewerCount = streamInfo.viewer_count;

    // Store sample
    const { data: sample } = await supabaseAdmin
      .from("samples")
      .insert({
        stream_id: streamId,
        viewer_count: viewerCount,
      })
      .select("id")
      .single();

    if (!sample) {
      console.error(`[sampling] Failed to store sample for stream ${streamId}`);
      return null;
    }

    // Update peak if this is a new peak
    if (!stream.peak || viewerCount > stream.peak) {
      await supabaseAdmin
        .from("streams")
        .update({ peak: viewerCount })
        .eq("id", streamId);
    }

    console.log(`[sampling] Sampled stream ${streamId}: ${viewerCount} viewers`);

    return {
      sampleId: sample.id,
      viewerCount,
    };
  } catch (error) {
    console.error(`[sampling] Error sampling stream ${streamId}:`, error);
    return null;
  }
}

/**
 * Start sampling for a stream
 * This should be called after a post is made
 * In production, this would trigger a background job or cron task
 */
export async function startSampling(streamId: number): Promise<void> {
  console.log(`[sampling] Starting sampling for stream ${streamId}`);

  // For MVP, we'll just take an initial sample
  // In production, you'd want to:
  // 1. Schedule periodic samples (e.g., every 5 minutes for the first hour, then every 15 minutes)
  // 2. Use a job queue or cron system to run the samples
  // 3. Continue sampling until the stream ends

  await sampleViewerCount(streamId);

  // Note: In production, you would use a job queue like BullMQ, Inngest, or similar
  // to schedule periodic sampling. For example:
  // - Sample immediately
  // - Sample at 5, 10, 15, 30, 60 minutes after post
  // - Continue sampling every 15-30 minutes until stream ends
}

/**
 * Calculate lift (increase in viewers) from samples
 * Lift = (average viewers after post) - (baseline viewers before post)
 */
export async function calculateLift(streamId: number, postTime: Date): Promise<{
  baseline: number;
  afterPost: number;
  lift: number;
  liftPercent: number;
} | null> {
  try {
    // Get all samples for this stream
    const { data: samples } = await supabaseAdmin
      .from("samples")
      .select("*")
      .eq("stream_id", streamId)
      .order("taken_at", { ascending: true });

    if (!samples || samples.length === 0) {
      return null;
    }

    // Split samples into before and after post
    const beforePost = samples.filter(
      (s) => new Date(s.taken_at) < postTime
    );
    const afterPost = samples.filter(
      (s) => new Date(s.taken_at) >= postTime
    );

    if (beforePost.length === 0 || afterPost.length === 0) {
      // Not enough data to calculate lift
      return null;
    }

    // Calculate baseline (average viewers before post)
    const baseline =
      beforePost.reduce((sum, s) => sum + s.viewer_count, 0) /
      beforePost.length;

    // Calculate average viewers after post
    const afterPostAvg =
      afterPost.reduce((sum, s) => sum + s.viewer_count, 0) /
      afterPost.length;

    // Calculate lift
    const lift = afterPostAvg - baseline;
    const liftPercent = baseline > 0 ? (lift / baseline) * 100 : 0;

    return {
      baseline: Math.round(baseline),
      afterPost: Math.round(afterPostAvg),
      lift: Math.round(lift),
      liftPercent: Math.round(liftPercent * 10) / 10, // Round to 1 decimal
    };
  } catch (error) {
    console.error(`[sampling] Error calculating lift for stream ${streamId}:`, error);
    return null;
  }
}

/**
 * Get all samples for a stream
 */
export async function getSamples(streamId: number): Promise<
  Array<{
    id: number;
    taken_at: string;
    viewer_count: number;
  }>
> {
  const { data: samples } = await supabaseAdmin
    .from("samples")
    .select("*")
    .eq("stream_id", streamId)
    .order("taken_at", { ascending: true });

  return samples || [];
}
