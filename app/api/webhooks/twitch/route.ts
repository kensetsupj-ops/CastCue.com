import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { sendStreamStartNotification } from "@/lib/push";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify Twitch EventSub signature
 */
function verifySignature(
  req: NextRequest,
  body: string
): boolean {
  const messageId = req.headers.get("twitch-eventsub-message-id");
  const timestamp = req.headers.get("twitch-eventsub-message-timestamp");
  const signature = req.headers.get("twitch-eventsub-message-signature");

  if (!messageId || !timestamp || !signature) {
    return false;
  }

  const secret = process.env.TWITCH_EVENTSUB_SECRET;
  if (!secret) {
    console.error("TWITCH_EVENTSUB_SECRET is not set");
    return false;
  }

  // Construct the message
  const message = messageId + timestamp + body;

  // Calculate HMAC
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  const expectedSignature = `sha256=${hmac}`;

  // Compare signatures
  return signature === expectedSignature;
}

/**
 * POST /api/webhooks/twitch
 * Twitch EventSub webhook endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify signature
    if (!verifySignature(req, rawBody)) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const messageType = req.headers.get("twitch-eventsub-message-type");

    // Handle challenge (webhook verification)
    if (messageType === "webhook_callback_verification") {
      console.log("Received challenge:", body.challenge);
      return new NextResponse(body.challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Handle revocation
    if (messageType === "revocation") {
      console.log("Subscription revoked:", body);
      // TODO: Update subscription status in database
      return new NextResponse(null, { status: 204 });
    }

    // Handle notification
    if (messageType === "notification") {
      const { subscription, event } = body;

      // Handle stream.online event
      if (subscription.type === "stream.online") {
        await handleStreamOnline(event);
      }

      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: "Unknown message type" }, { status: 400 });
  } catch (error) {
    console.error("Twitch webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle stream.online event
 */
async function handleStreamOnline(event: any) {
  const {
    broadcaster_user_id,
    broadcaster_user_login,
    broadcaster_user_name,
    id: streamId,
    type,
    started_at,
  } = event;

  console.log("Stream online event:", {
    broadcaster_user_id,
    broadcaster_user_login,
    streamId,
  });

  try {
    // Find user by Twitch user ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("twitch_user_id", broadcaster_user_id)
      .single();

    if (profileError || !profile) {
      console.error("User not found for broadcaster:", broadcaster_user_id);
      return;
    }

    const userId = profile.user_id;

    // Get stream details from Twitch Helix API
    const streamDetails = await getTwitchStreamDetails(
      broadcaster_user_id,
      streamId
    );

    // Create stream record
    const { data: streamRecord, error: streamError } = await supabaseAdmin
      .from("streams")
      .insert({
        user_id: userId,
        platform: "twitch",
        stream_id: streamId,
        started_at: started_at,
      })
      .select("id")
      .single();

    if (streamError || !streamRecord) {
      console.error("Failed to create stream record:", streamError);
      return;
    }

    const dbStreamId = streamRecord.id;

    // Create draft for manual approval
    const { data: draftRecord, error: draftError } = await supabaseAdmin
      .from("drafts")
      .insert({
        user_id: userId,
        stream_id: dbStreamId,
        title: streamDetails.title,
        twitch_url: `https://twitch.tv/${broadcaster_user_login}`,
        image_url: streamDetails.thumbnail_url,
        status: "pending",
      })
      .select("id")
      .single();

    if (draftError || !draftRecord) {
      console.error("Failed to create draft:", draftError);
      return;
    }

    console.log("Draft created for stream:", streamId, "Draft ID:", draftRecord.id);

    // Send push notification to user
    await sendStreamStartNotification(
      userId,
      draftRecord.id,
      streamDetails.title
    );

    // Note: Sampling is handled by cron job (/api/cron/sampling)
  } catch (error) {
    console.error("Error handling stream.online:", error);
  }
}

/**
 * Get stream details from Twitch Helix API
 */
async function getTwitchStreamDetails(
  broadcasterId: string,
  streamId: string
): Promise<any> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const accessToken = process.env.TWITCH_ACCESS_TOKEN;

  if (!clientId || !accessToken) {
    throw new Error("Twitch API credentials not configured");
  }

  const response = await fetch(
    `https://api.twitch.tv/helix/streams?user_id=${broadcasterId}`,
    {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch stream details from Twitch");
  }

  const data = await response.json();
  const stream = data.data[0];

  return {
    title: stream?.title || "Untitled Stream",
    thumbnail_url: stream?.thumbnail_url?.replace("{width}", "1920").replace("{height}", "1080") || null,
    game_name: stream?.game_name || null,
    viewer_count: stream?.viewer_count || 0,
  };
}
