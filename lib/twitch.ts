import { createHmac } from "crypto";
import { z } from "zod";

const TWITCH_EVENTSUB_MESSAGE_ID = "twitch-eventsub-message-id";
const TWITCH_EVENTSUB_MESSAGE_TIMESTAMP = "twitch-eventsub-message-timestamp";
const TWITCH_EVENTSUB_MESSAGE_SIGNATURE = "twitch-eventsub-message-signature";
const TWITCH_EVENTSUB_MESSAGE_TYPE = "twitch-eventsub-message-type";

const HMAC_PREFIX = "sha256=";

/**
 * Verify Twitch EventSub webhook signature
 */
export function verifyTwitchSignature(
  headers: Headers,
  body: string
): boolean {
  const messageId = headers.get(TWITCH_EVENTSUB_MESSAGE_ID);
  const timestamp = headers.get(TWITCH_EVENTSUB_MESSAGE_TIMESTAMP);
  const signature = headers.get(TWITCH_EVENTSUB_MESSAGE_SIGNATURE);

  if (!messageId || !timestamp || !signature) {
    return false;
  }

  const secret = process.env.TWITCH_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("TWITCH_WEBHOOK_SECRET is not set");
  }

  const message = messageId + timestamp + body;
  const hmac = createHmac("sha256", secret);
  hmac.update(message);
  const expectedSignature = HMAC_PREFIX + hmac.digest("hex");

  return signature === expectedSignature;
}

/**
 * Get message type from headers
 */
export function getTwitchMessageType(headers: Headers): string | null {
  return headers.get(TWITCH_EVENTSUB_MESSAGE_TYPE);
}

/**
 * Twitch EventSub schemas
 */
export const StreamOnlineEventSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.literal("stream.online"),
    version: z.string(),
    status: z.string(),
    cost: z.number(),
    condition: z.object({
      broadcaster_user_id: z.string(),
    }),
    transport: z.object({
      method: z.string(),
      callback: z.string(),
    }),
    created_at: z.string(),
  }),
  event: z.object({
    id: z.string(), // stream_id
    broadcaster_user_id: z.string(),
    broadcaster_user_login: z.string(),
    broadcaster_user_name: z.string(),
    type: z.string(),
    started_at: z.string(),
  }),
});

export const VerificationSchema = z.object({
  challenge: z.string(),
  subscription: z.object({
    id: z.string(),
    type: z.string(),
    version: z.string(),
    status: z.string(),
    cost: z.number(),
    condition: z.object({
      broadcaster_user_id: z.string(),
    }),
    transport: z.object({
      method: z.string(),
      callback: z.string(),
    }),
    created_at: z.string(),
  }),
});

export const RevocationSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.string(),
    version: z.string(),
    status: z.string(),
    cost: z.number(),
    condition: z.object({
      broadcaster_user_id: z.string(),
    }),
    transport: z.object({
      method: z.string(),
      callback: z.string(),
    }),
    created_at: z.string(),
  }),
});

/**
 * Twitch API client
 */
export class TwitchClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;

  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID!;
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Twitch credentials are not set");
    }
  }

  /**
   * Get app access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get Twitch access token");
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  /**
   * Create EventSub subscription
   */
  async createSubscription(
    type: string,
    broadcasterUserId: string,
    callback: string
  ): Promise<{ id: string; status: string }> {
    const token = await this.getAccessToken();

    const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers: {
        "Client-ID": this.clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        version: "1",
        condition: {
          broadcaster_user_id: broadcasterUserId,
        },
        transport: {
          method: "webhook",
          callback,
          secret: process.env.TWITCH_WEBHOOK_SECRET,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create subscription: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.data[0].id,
      status: data.data[0].status,
    };
  }

  /**
   * Get stream information
   */
  async getStream(broadcasterUserId: string): Promise<{
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: string;
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
  } | null> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${broadcasterUserId}`,
      {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get stream information");
    }

    const data = await response.json();
    return data.data[0] || null;
  }

  /**
   * Delete EventSub subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`,
      {
        method: "DELETE",
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete subscription");
    }
  }
}
