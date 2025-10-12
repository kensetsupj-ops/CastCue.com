import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TwitchClient } from "@/lib/twitch";
import { supabaseAdmin } from "@/lib/db";

const SubscribeRequestSchema = z.object({
  user_id: z.string().uuid(),
  broadcaster_user_id: z.string(),
});

/**
 * Create Twitch EventSub subscription
 * POST /api/twitch/subscribe
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, broadcaster_user_id } = SubscribeRequestSchema.parse(body);

    const client = new TwitchClient();
    const callback = `${process.env.APP_ORIGIN}/api/twitch/webhook`;

    // Create subscription
    const subscription = await client.createSubscription(
      "stream.online",
      broadcaster_user_id,
      callback
    );

    // Store subscription record
    await supabaseAdmin.from("eventsub_subscriptions").insert({
      user_id,
      twitch_subscription_id: subscription.id,
      type: "stream.online",
      status: subscription.status,
    });

    return NextResponse.json({
      subscription_id: subscription.id,
      status: subscription.status,
    });
  } catch (error: any) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete Twitch EventSub subscription
 * DELETE /api/twitch/subscribe
 */
export async function DELETE(req: NextRequest) {
  try {
    const subscription_id = req.nextUrl.searchParams.get("subscription_id");

    if (!subscription_id) {
      return NextResponse.json(
        { error: "subscription_id is required" },
        { status: 400 }
      );
    }

    const client = new TwitchClient();
    await client.deleteSubscription(subscription_id);

    // Update database
    await supabaseAdmin
      .from("eventsub_subscriptions")
      .update({ status: "deleted" })
      .eq("twitch_subscription_id", subscription_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete subscription error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
