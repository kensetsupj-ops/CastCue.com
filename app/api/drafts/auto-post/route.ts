import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getUserAccessToken, postTweet, uploadMedia } from "@/lib/x";
import { replaceWithShortLink } from "@/lib/link";
import { startSampling } from "@/lib/sampling";
import { selectTemplateForABTest } from "@/lib/ab-test";
import { hash } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/ratelimit";
import { isTwitchCDNUrl } from "@/lib/twitch";
import { ApiErrors } from "@/lib/api-errors";

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

    // 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return ApiErrors.notAuthenticated();
    }

    // SECURITY: Rate limiting - 5 posts per minute to prevent abuse
    const rateLimitError = checkRateLimit(req, user.id, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5, // 5 requests per minute
    });
    if (rateLimitError) {
      return rateLimitError;
    }

    // Get draft
    // CONCURRENCY: Store updated_at for optimistic locking
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select("*")
      .eq("id", draft_id)
      .eq("status", "pending")
      .single();

    if (draftError || !draft) {
      return ApiErrors.draftNotFound("投稿案が見つかりません。既に処理されているか、削除された可能性があります。");
    }

    // CONCURRENCY: Save original updated_at timestamp for optimistic locking
    const originalUpdatedAt = draft.updated_at;

    // 所有権チェック
    if (draft.user_id !== user.id) {
      return ApiErrors.forbidden("この投稿案にアクセスする権限がありません。");
    }

    // Select template using A/B testing logic
    // This will use default template if set, otherwise use most recently created
    // Falls back to system default template if user has no templates
    const template = await selectTemplateForABTest(draft.user_id);

    // Determine if this is the system default template
    const isSystemDefault = template.id === "system-default";

    // SECURITY: Verify template ownership (defense in depth)
    // Skip this check for system default template
    if (!isSystemDefault && template.user_id !== user.id) {
      console.error("[auto-post] Template ownership violation", {
        templateId: template.id,
        templateUserId: template.user_id,
        authenticatedUserId: user.id,
      });
      return ApiErrors.forbidden("このテンプレートにアクセスする権限がありません。");
    }

    // Render template with draft data
    // Note: {twitch_url} is always added at the end automatically
    let body_text = template.body
      .replace(/{twitch_url}/g, "") // Remove {twitch_url} placeholder if it exists (will be added at the end)
      .replace(/{title}/g, draft.title) // Support {title} for backward compatibility
      .replace(/\{配信タイトル\}/g, draft.title) // Support {配信タイトル} placeholder
      .trim(); // Remove trailing whitespace

    // Always add Twitch URL at the end
    body_text = `${body_text}\n${draft.twitch_url}`;

    // CONCURRENCY: Acquire lock by updating draft status to "posted" BEFORE posting to X
    // This prevents duplicate posts if user clicks multiple times or from multiple devices
    const { data: updatedDraft, error: updateError } = await supabaseAdmin
      .from("drafts")
      .update({ status: "posted" })
      .eq("id", draft_id)
      .eq("status", "pending")
      .eq("updated_at", originalUpdatedAt)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("[auto-post] Failed to update draft status:", updateError);
      return ApiErrors.serverError(updateError, false);
    }

    // CONCURRENCY: If no rows were updated, another request already processing this draft
    if (!updatedDraft) {
      console.warn(`[auto-post] Draft ${draft_id} was already processed by another request (race condition detected)`);
      return ApiErrors.draftAlreadyProcessed();
    }

    // Get user's X access token
    let accessToken: string;
    try {
      accessToken = await getUserAccessToken(draft.user_id);
    } catch (error: any) {
      console.error("[auto-post] Failed to get X access token:", error);

      // ROLLBACK: Reset draft status to pending if we can't get access token
      await supabaseAdmin
        .from("drafts")
        .update({ status: "pending" })
        .eq("id", draft_id);

      return ApiErrors.xConnectionNotFound();
    }

    // Upload thumbnail image if available
    let mediaIds: string[] | undefined;
    if (draft.thumbnail_url) {
      try {
        console.log(`[auto-post] Uploading thumbnail: ${draft.thumbnail_url}`);

        // SECURITY: Validate thumbnail URL to prevent SSRF attacks
        if (!isTwitchCDNUrl(draft.thumbnail_url)) {
          console.error(`[auto-post] Invalid thumbnail URL (SSRF protection): ${draft.thumbnail_url}`);
          throw new Error("Invalid thumbnail URL");
        }

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

    // Replace Twitch URL with short link for click tracking
    const campaignId = `stream-${draft.stream_id}`;
    const hasMedia = !!(mediaIds && mediaIds.length > 0); // Check if media was successfully uploaded
    const { text: body_with_short_link, linkId } = await replaceWithShortLink(
      draft.user_id,
      body_text,
      draft.twitch_url,
      campaignId,
      draft.stream_id, // For OGP metadata generation
      hasMedia // Skip OGP if media attached (to avoid conflict)
    );
    body_text = body_with_short_link;

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

      // ROLLBACK: Reset draft status to pending if posting failed
      await supabaseAdmin
        .from("drafts")
        .update({ status: "pending" })
        .eq("id", draft_id);

      return ApiErrors.serverError("Xへの投稿に失敗しました。時間をおいて再度お試しください。", true);
    }

    const latencyMs = Date.now() - startTime;

    // Generate idempotency key (deterministic based on draft and template)
    const idempotencyKey = hash(`draft-${draft_id}-template-${template.id}`);

    // Create delivery record
    await supabaseAdmin.from("deliveries").insert({
      user_id: draft.user_id,
      stream_id: draft.stream_id,
      channel: "x",
      status: deliveryStatus,
      idempotency_key: idempotencyKey,
      post_id: postResult.id,
      template_id: isSystemDefault ? null : template.id, // Don't save system default template ID (not a UUID)
      body_text: body_text, // Store actual post content
      error: errorMessage,
      latency_ms: latencyMs,
    });

    // Draft status was already updated to "posted" before posting to X (line 186-215)
    // No need to update again here

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
    console.error("[auto-post] Unexpected error:", error);
    return ApiErrors.serverError(error, false);
  }
}
