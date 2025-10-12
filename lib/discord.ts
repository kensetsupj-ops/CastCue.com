import { supabaseAdmin } from "./db";

/**
 * Discord webhook message structure
 */
interface DiscordMessage {
  content: string;
  username?: string;
  avatar_url?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    thumbnail?: {
      url: string;
    };
    timestamp?: string;
  }>;
}

/**
 * Send a message to Discord via webhook
 */
export async function sendDiscordMessage(
  webhookUrl: string,
  message: DiscordMessage
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send Discord message: ${error}`);
  }
}

/**
 * Send stream notification to Discord
 */
export async function sendStreamNotification(
  userId: string,
  title: string,
  streamUrl: string,
  thumbnailUrl?: string
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("discord_webhooks")
    .select("webhook_url")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Discord webhook not found");
  }

  const message: DiscordMessage = {
    content: `🔴 **配信開始!**`,
    embeds: [
      {
        title,
        url: streamUrl,
        color: 0x9146ff, // Twitch purple
        fields: [
          {
            name: "リンク",
            value: streamUrl,
            inline: false,
          },
        ],
        thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await sendDiscordMessage(data.webhook_url, message);
}

/**
 * Test Discord webhook
 */
export async function testDiscordWebhook(webhookUrl: string): Promise<void> {
  const message: DiscordMessage = {
    content: "✅ CastCue - Webhook connection test successful!",
    embeds: [
      {
        title: "Test Notification",
        description: "This is a test message from CastCue.",
        color: 0x6366f1, // Primary color
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await sendDiscordMessage(webhookUrl, message);
}
