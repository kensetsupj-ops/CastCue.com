import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { getUserAccessToken, postTweet } from "@/lib/x";
import { replaceWithShortLink } from "@/lib/link";
import { startSampling } from "@/lib/sampling";
import { randomBytes } from "crypto";

const ManualPostRequestSchema = z.object({
  body: z.string().min(1).max(280),
  media_ids: z.array(z.string()).max(4).optional(), // X allows up to 4 images
  template_id: z.string().uuid().optional(), // For A/B testing tracking
});

/**
 * Manual post draft with user-edited body
 * POST /api/drafts/[draftId]/post
 *
 * This endpoint is called from the approval page when user manually posts
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const { draftId } = params;
    const body = await req.json();
    const { body: bodyText, media_ids, template_id } = ManualPostRequestSchema.parse(body);

    // Get draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select("*, stream_id")
      .eq("id", draftId)
      .eq("status", "pending")
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft not found or already processed" },
        { status: 404 }
      );
    }

    // Replace Twitch URL with short link for click tracking
    const campaignId = `stream-${draft.stream_id}`;
    const { text: bodyWithShortLink, linkId } = await replaceWithShortLink(
      draft.user_id,
      bodyText,
      draft.twitch_url,
      campaignId
    );

    // Get user's X access token
    const accessToken = await getUserAccessToken(draft.user_id);

    // Post to X (Twitter)
    const startTime = Date.now();
    let postResult;
    let deliveryStatus: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    try {
      postResult = await postTweet(accessToken, bodyWithShortLink, media_ids);
      console.log(`[manual-post] Posted to X: ${postResult.id}`);
    } catch (error: any) {
      console.error("[manual-post] Failed to post to X:", error);
      deliveryStatus = "failed";
      errorMessage = error.message;

      return NextResponse.json(
        {
          success: false,
          error: "Failed to post to X",
          details: error.message,
        },
        { status: 500 }
      );
    }

    const latencyMs = Date.now() - startTime;

    // Generate idempotency key
    const idempotencyKey = randomBytes(16).toString("hex");

    // Create delivery record
    await supabaseAdmin.from("deliveries").insert({
      user_id: draft.user_id,
      stream_id: draft.stream_id,
      channel: "x",
      status: deliveryStatus,
      idempotency_key: idempotencyKey,
      post_id: postResult.id,
      template_id: template_id || null, // Track which template was used (if provided)
      error: errorMessage,
      latency_ms: latencyMs,
    });

    // Update draft status
    await supabaseAdmin
      .from("drafts")
      .update({ status: "posted" })
      .eq("id", draftId);

    // Start viewer count sampling
    if (draft.stream_id) {
      try {
        await startSampling(draft.stream_id);
        console.log(`[manual-post] Started sampling for stream ${draft.stream_id}`);
      } catch (samplingError) {
        console.error("[manual-post] Failed to start sampling:", samplingError);
        // Don't fail the post if sampling fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Post successful",
      post_id: postResult.id,
      link_id: linkId,
      body: bodyWithShortLink,
    });
  } catch (error: any) {
    console.error("Manual post error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
