import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
// VAPID subject must be https: or mailto: URL
// In development, use mailto: format as http://localhost is not allowed
const vapidSubject = process.env.NEXT_PUBLIC_SITE_URL || "mailto:dev@castcue.com";

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
 * Send draft notification to user (for stream start)
 * This is the main function called by the webhook handler
 */
export async function sendDraftNotification(
  userId: string,
  draftId: string,
  streamTitle: string,
  twitchUrl: string
): Promise<{ sent: number; failed: number }> {
  // Get user settings for grace timer
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("grace_timer, auto_action")
    .eq("user_id", userId)
    .single();

  const graceTimer = settings?.grace_timer || 90; // Default 90 seconds
  const autoAction = settings?.auto_action || "post"; // Default to post

  // Build notification message with grace timer info
  const actionText = autoAction === "post" ? "自動投稿" : "スキップ";
  const bodyText = `「${streamTitle}」の告知が必要です\n\n操作がない場合${graceTimer}秒後に${actionText}されます`;

  const payload: PushNotificationPayload = {
    title: "配信開始",
    body: bodyText,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: {
      url: `/approve/${draftId}`,
      draftId: draftId,
      type: "stream_start",
      twitchUrl: twitchUrl,
      graceTimer: graceTimer,
      autoAction: autoAction,
    },
  };

  try {
    const result = await sendPushNotification(userId, payload);
    return { sent: result.success, failed: result.failed };
  } catch (error) {
    console.error("Failed to send draft notification:", error);
    return { sent: 0, failed: 1 };
  }
}

/**
 * Send stream start notification to user
 * @deprecated Use sendDraftNotification instead
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

/**
 * Send test notification to user
 */
export async function sendTestNotification(
  userId: string
): Promise<{ sent: number; failed: number }> {
  const payload: PushNotificationPayload = {
    title: "🔔 テスト通知",
    body: "CastCueのプッシュ通知が正常に動作しています",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: {
      type: "test",
      // No draftId or actions for test notifications
    },
  };

  try {
    const result = await sendPushNotification(userId, payload);
    return { sent: result.success, failed: result.failed };
  } catch (error) {
    console.error("Failed to send test notification:", error);
    return { sent: 0, failed: 1 };
  }
}

/**
 * Send game change notification to user
 */
export async function sendGameChangeNotification(
  userId: string,
  draftId: string,
  previousCategory: string | null,
  newCategory: string,
  twitchUrl: string
): Promise<{ sent: number; failed: number }> {
  // Get user settings for grace timer
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("grace_timer, auto_action")
    .eq("user_id", userId)
    .single();

  const graceTimer = settings?.grace_timer || 90; // Default 90 seconds
  const autoAction = settings?.auto_action || "post"; // Default to post

  const changeText = previousCategory
    ? `${previousCategory} → ${newCategory}`
    : `${newCategory} に変更`;

  // Build notification message with grace timer info
  const actionText = autoAction === "post" ? "自動投稿" : "スキップ";
  const bodyText = `${changeText}\n\n操作がない場合${graceTimer}秒後に${actionText}されます`;

  const payload: PushNotificationPayload = {
    title: "🎮 ゲーム変更",
    body: bodyText,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: {
      url: `/approve/${draftId}`,
      draftId: draftId,
      type: "game_change",
      previousCategory: previousCategory || "",
      newCategory: newCategory,
      twitchUrl: twitchUrl,
      graceTimer: graceTimer,
      autoAction: autoAction,
    },
  };

  try {
    const result = await sendPushNotification(userId, payload);
    return { sent: result.success, failed: result.failed };
  } catch (error) {
    console.error("Failed to send game change notification:", error);
    return { sent: 0, failed: 1 };
  }
}
