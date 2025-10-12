import { NextRequest, NextResponse } from "next/server";
import {
  verifyTwitchSignature,
  getTwitchMessageType,
  StreamOnlineEventSchema,
  VerificationSchema,
} from "@/lib/twitch";
import { supabaseAdmin } from "@/lib/db";
import { hash } from "@/lib/crypto";

/**
 * Twitch EventSub Webhook Handler
 * POST /api/twitch/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify signature
    if (!verifyTwitchSignature(req.headers, rawBody)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const messageType = getTwitchMessageType(req.headers);
    const body = JSON.parse(rawBody);

    // Handle verification challenge
    if (messageType === "webhook_callback_verification") {
      const parsed = VerificationSchema.parse(body);
      return new NextResponse(parsed.challenge, { status: 200 });
    }

    // Handle stream.online notification
    if (messageType === "notification") {
      const parsed = StreamOnlineEventSchema.parse(body);

      if (parsed.subscription.type === "stream.online") {
        const messageId = req.headers.get("twitch-eventsub-message-id");

        // Check idempotency
        if (messageId) {
          const { data: existing } = await supabaseAdmin
            .from("deliveries")
            .select("id")
            .eq("idempotency_key", messageId)
            .single();

          if (existing) {
            return new NextResponse(null, { status: 204 });
          }
        }

        // Get user_id from broadcaster_id
        const { data: twitchAccount } = await supabaseAdmin
          .from("twitch_accounts")
          .select("user_id")
          .eq("broadcaster_id", parsed.event.broadcaster_user_id)
          .single();

        if (!twitchAccount) {
          console.error("Twitch account not found for broadcaster:", parsed.event.broadcaster_user_id);
          return new NextResponse(null, { status: 204 });
        }

        // Get stream information from Twitch API
        const { TwitchClient } = await import("@/lib/twitch");
        const twitchClient = new TwitchClient();
        const streamInfo = await twitchClient.getStream(parsed.event.broadcaster_user_id);

        if (!streamInfo) {
          console.error("Stream information not available");
          return new NextResponse(null, { status: 204 });
        }

        // Create stream record
        const { data: stream } = await supabaseAdmin
          .from("streams")
          .insert({
            user_id: twitchAccount.user_id,
            platform: "twitch",
            stream_id: parsed.event.id,
            started_at: parsed.event.started_at,
          })
          .select("id")
          .single();

        if (!stream) {
          console.error("Failed to create stream record");
          return new NextResponse(null, { status: 204 });
        }

        // Create draft for review approval mode (F-7)
        const twitchUrl = `https://twitch.tv/${parsed.event.broadcaster_user_login}`;
        const { data: draft, error: draftError } = await supabaseAdmin
          .from("drafts")
          .insert({
            user_id: twitchAccount.user_id,
            stream_id: stream.id,
            title: streamInfo.title,
            twitch_url: twitchUrl,
            image_url: streamInfo.thumbnail_url.replace("{width}", "1920").replace("{height}", "1080"),
            status: "pending",
          })
          .select("id")
          .single();

        if (draftError || !draft) {
          console.error("Failed to create draft:", draftError);
          return new NextResponse(null, { status: 204 });
        }

        // Send Web Push notification
        const { sendDraftNotification } = await import("@/lib/push");
        try {
          const result = await sendDraftNotification(
            twitchAccount.user_id,
            draft.id,
            streamInfo.title,
            twitchUrl
          );
          console.log(`[webhook] Push notification sent. Sent: ${result.sent}, Failed: ${result.failed}`);
        } catch (pushError) {
          console.error("[webhook] Failed to send push notification:", pushError);
          // Don't fail the webhook if push fails
        }

        return new NextResponse(null, { status: 204 });
      }
    }

    // Handle revocation
    if (messageType === "revocation") {
      const subscriptionId = body.subscription?.id;
      if (subscriptionId) {
        await supabaseAdmin
          .from("eventsub_subscriptions")
          .update({
            status: "revoked",
            revocation_reason: body.subscription?.status,
          })
          .eq("twitch_subscription_id", subscriptionId);
      }
      return new NextResponse(null, { status: 204 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
