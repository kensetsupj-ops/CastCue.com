import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { getUserAccessToken, postTweet, uploadMedia } from "@/lib/x";
import { replaceWithShortLink } from "@/lib/link";
import { startSampling } from "@/lib/sampling";
import { selectTemplateForABTest } from "@/lib/ab-test";
import { randomBytes } from "crypto";

const AutoPostRequestSchema = z.object({
  draft_id: z.string().uuid(),
});

/**
 * Auto-post draft with default template
 * POST /api/drafts/auto-post
 *
 * This endpoint is called by the Service Worker when user clicks
 * "テンプレートで投稿" button in the push notification
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draft_id } = AutoPostRequestSchema.parse(body);

    // Get draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select("*, stream_id")
      .eq("id", draft_id)
      .eq("status", "pending")
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft not found or already processed" },
        { status: 404 }
      );
    }

    // Select template using A/B testing logic
    // This will use default template if set, otherwise randomly select A or B (50/50)
    const template = await selectTemplateForABTest(draft.user_id);

    if (!template) {
      return NextResponse.json(
        { error: "No template found for user" },
        { status: 404 }
      );
    }

    // Render template with draft data
    let body_text = template.body
      .replace(/{title}/g, draft.title)
      .replace(/{category}/g, "") // TODO: Get category from stream info
      .replace(/{twitch_url}/g, draft.twitch_url);

    // Replace Twitch URL with short link for click tracking
    const campaignId = `stream-${draft.stream_id}`;
    const { text: body_with_short_link, linkId } = await replaceWithShortLink(
      draft.user_id,
      body_text,
      draft.twitch_url,
      campaignId
    );
    body_text = body_with_short_link;

    // Get user's X access token
    const accessToken = await getUserAccessToken(draft.user_id);

    // Upload thumbnail image if available
    let mediaIds: string[] | undefined;
    if (draft.thumbnail_url) {
      try {
        console.log(`[auto-post] Uploading thumbnail: ${draft.thumbnail_url}`);

        // Download image from Twitch
        const imageResponse = await fetch(draft.thumbnail_url);
        if (imageResponse.ok) {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

          // Upload to X API
          const mediaId = await uploadMedia(accessToken, imageBuffer, contentType);
          mediaIds = [mediaId];
          console.log(`[auto-post] Uploaded media: ${mediaId}`);
        }
      } catch (uploadError) {
        console.error("[auto-post] Failed to upload thumbnail:", uploadError);
        // Continue without image if upload fails
      }
    }

    // Post to X (Twitter)
    const startTime = Date.now();
    let postResult;
    let deliveryStatus: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    try {
      postResult = await postTweet(accessToken, body_text, mediaIds);
      console.log(`[auto-post] Posted to X: ${postResult.id}`);
    } catch (error: any) {
      console.error("[auto-post] Failed to post to X:", error);
      deliveryStatus = "failed";
      errorMessage = error.message;

      // Don't update draft status if posting failed
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
      template_id: template.id, // Track which template was used for A/B testing
      error: errorMessage,
      latency_ms: latencyMs,
    });

    // Update draft status
    await supabaseAdmin
      .from("drafts")
      .update({ status: "posted" })
      .eq("id", draft_id);

    // Start viewer count sampling
    if (draft.stream_id) {
      try {
        await startSampling(draft.stream_id);
        console.log(`[auto-post] Started sampling for stream ${draft.stream_id}`);
      } catch (samplingError) {
        console.error("[auto-post] Failed to start sampling:", samplingError);
        // Don't fail the post if sampling fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Auto-post successful",
      post_id: postResult.id,
      link_id: linkId,
      body: body_text,
    });
  } catch (error: any) {
    console.error("Auto-post error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
