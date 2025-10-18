import { NextRequest, NextResponse } from "next/server";
import {
  verifyTwitchSignature,
  getTwitchMessageType,
  StreamOnlineEventSchema,
  StreamUpdateEventSchema,
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

    // Verify signature (HMAC-SHA256 provides sufficient replay protection)
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

    // Handle stream notifications
    if (messageType === "notification") {
      const eventType = body.subscription?.type;

      if (eventType === "stream.online") {
        const parsed = StreamOnlineEventSchema.parse(body);
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
          // Webhookは常に2xxを返すべき（エラーでも再試行される可能性があるため）
          // ただし、ログには記録する
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
        const thumbnailUrl = streamInfo.thumbnail_url.replace("{width}", "1920").replace("{height}", "1080");
        const { data: stream } = await supabaseAdmin
          .from("streams")
          .insert({
            user_id: twitchAccount.user_id,
            platform: "twitch",
            stream_id: parsed.event.id,
            started_at: parsed.event.started_at,
            thumbnail_url: thumbnailUrl,
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
            image_url: thumbnailUrl,
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
      } else if (eventType === "stream.update") {
        // Handle stream.update for game change detection
        const updateParsed = StreamUpdateEventSchema.parse(body);

        // Get user_id from broadcaster_id
        const { data: twitchAccount } = await supabaseAdmin
          .from("twitch_accounts")
          .select("user_id")
          .eq("broadcaster_id", updateParsed.event.broadcaster_user_id)
          .single();

        if (!twitchAccount) {
          console.error("Twitch account not found for broadcaster:", updateParsed.event.broadcaster_user_id);
          return new NextResponse(null, { status: 204 });
        }

        // Find active stream for this broadcaster
        const { data: stream } = await supabaseAdmin
          .from("streams")
          .select("id, current_category")
          .eq("user_id", twitchAccount.user_id)
          .is("ended_at_est", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (!stream) {
          console.log("No active stream found for game change");
          return new NextResponse(null, { status: 204 });
        }

        const currentCategory = stream.current_category;
        const newCategory = updateParsed.event.category_name;

        // Check if category changed
        if (currentCategory && currentCategory !== newCategory) {
          console.log(`Game change detected: ${currentCategory} -> ${newCategory}`);

          // Get stream info for thumbnail
          const { TwitchClient } = await import("@/lib/twitch");
          const twitchClient = new TwitchClient();
          const streamInfo = await twitchClient.getStream(updateParsed.event.broadcaster_user_id);

          const thumbnailUrl = streamInfo?.thumbnail_url.replace("{width}", "1920").replace("{height}", "1080") || "";

          // Handle game change
          const { handleGameChange } = await import("@/lib/game-change");
          const result = await handleGameChange(
            twitchAccount.user_id,
            stream.id,
            currentCategory,
            newCategory,
            updateParsed.event.broadcaster_user_login,
            updateParsed.event.title,
            thumbnailUrl
          );

          if (result.success && result.draftId) {
            // Send Web Push notification for game change
            const { sendGameChangeNotification } = await import("@/lib/push");
            try {
              await sendGameChangeNotification(
                twitchAccount.user_id,
                result.draftId,
                currentCategory,
                newCategory,
                `https://twitch.tv/${updateParsed.event.broadcaster_user_login}`
              );
              console.log(`[webhook] Game change notification sent for draft ${result.draftId}`);
            } catch (pushError) {
              console.error("[webhook] Failed to send game change notification:", pushError);
            }
          } else {
            console.log(`[webhook] Game change not notified: ${result.reason}`);
          }
        } else if (!currentCategory) {
          // First time setting category for this stream
          await supabaseAdmin
            .from("streams")
            .update({ current_category: newCategory })
            .eq("id", stream.id);
        }

        return new NextResponse(null, { status: 204 });
      } else {
        // Unknown event type - log for debugging
        console.warn(`[webhook] Unknown Twitch notification event type: ${eventType}`, {
          eventType,
          subscriptionId: body.subscription?.id,
          subscriptionStatus: body.subscription?.status,
        });
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
