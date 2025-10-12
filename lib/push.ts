import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.NEXT_PUBLIC_SITE_URL || "https://castcue.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    draftId?: string;
    [key: string]: any;
  };
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  try {
    // Get all push subscriptions for the user
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, keys")
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to fetch push subscriptions:", error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { success: 0, failed: 0 };
    }

    console.log(
      `Sending push notification to ${subscriptions.length} subscription(s)`
    );

    // Send notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            JSON.stringify(payload)
          );
          return { success: true };
        } catch (error: any) {
          console.error(`Failed to send to ${sub.endpoint}:`, error);

          // If subscription is invalid (410 Gone), remove it
          if (error.statusCode === 410) {
            await supabaseAdmin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            console.log(`Removed invalid subscription: ${sub.endpoint}`);
          }

          return { success: false };
        }
      })
    );

    // Count successes and failures
    const success = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - success;

    console.log(
      `Push notification sent: ${success} success, ${failed} failed`
    );

    return { success, failed };
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
}

/**
 * Send stream start notification to user
 */
export async function sendStreamStartNotification(
  userId: string,
  draftId: string,
  streamTitle: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: "配信開始",
    body: `「${streamTitle}」の告知が必要です`,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: {
      url: `/approve/${draftId}`,
      draftId: draftId,
    },
  };

  try {
    await sendPushNotification(userId, payload);
  } catch (error) {
    console.error("Failed to send stream start notification:", error);
    // Don't throw - notification failure shouldn't block the main flow
  }
}
