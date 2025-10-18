import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const TWITCH_EVENTSUB_MESSAGE_ID = "twitch-eventsub-message-id";
const TWITCH_EVENTSUB_MESSAGE_TIMESTAMP = "twitch-eventsub-message-timestamp";
const TWITCH_EVENTSUB_MESSAGE_SIGNATURE = "twitch-eventsub-message-signature";
const TWITCH_EVENTSUB_MESSAGE_TYPE = "twitch-eventsub-message-type";

const HMAC_PREFIX = "sha256=";

/**
 * Verify Twitch EventSub webhook signature using constant-time comparison
 * SECURITY: Uses timingSafeEqual to prevent timing attacks
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

  // SECURITY: Use constant-time comparison to prevent timing attacks
  // Convert strings to buffers for timingSafeEqual
  try {
    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    // Both buffers must be the same length for timingSafeEqual
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    // If any error occurs during comparison, reject the signature
    return false;
  }
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

export const StreamUpdateEventSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.literal("stream.update"),
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
    broadcaster_user_id: z.string(),
    broadcaster_user_login: z.string(),
    broadcaster_user_name: z.string(),
    title: z.string(),
    language: z.string(),
    category_id: z.string(),
    category_name: z.string(),
    is_mature: z.boolean(),
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
 * Stream offline event
 */
export const StreamOfflineEventSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.literal("stream.offline"),
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
    broadcaster_user_id: z.string(),
    broadcaster_user_login: z.string(),
    broadcaster_user_name: z.string(),
  }),
});

/**
 * Channel raid event
 */
export const ChannelRaidEventSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.literal("channel.raid"),
    version: z.string(),
    status: z.string(),
    cost: z.number(),
    condition: z.object({
      to_broadcaster_user_id: z.string(),
    }),
    transport: z.object({
      method: z.string(),
      callback: z.string(),
    }),
    created_at: z.string(),
  }),
  event: z.object({
    from_broadcaster_user_id: z.string(),
    from_broadcaster_user_login: z.string(),
    from_broadcaster_user_name: z.string(),
    to_broadcaster_user_id: z.string(),
    to_broadcaster_user_login: z.string(),
    to_broadcaster_user_name: z.string(),
    viewers: z.number(),
  }),
});

/**
 * Channel follow event
 */
export const ChannelFollowEventSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.literal("channel.follow"),
    version: z.string(),
    status: z.string(),
    cost: z.number(),
    condition: z.object({
      broadcaster_user_id: z.string(),
      moderator_user_id: z.string(),
    }),
    transport: z.object({
      method: z.string(),
      callback: z.string(),
    }),
    created_at: z.string(),
  }),
  event: z.object({
    user_id: z.string(),
    user_login: z.string(),
    user_name: z.string(),
    broadcaster_user_id: z.string(),
    broadcaster_user_login: z.string(),
    broadcaster_user_name: z.string(),
    followed_at: z.string(),
  }),
});

/**
 * Channel subscribe event
 */
export const ChannelSubscribeEventSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.literal("channel.subscribe"),
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
    user_id: z.string(),
    user_login: z.string(),
    user_name: z.string(),
    broadcaster_user_id: z.string(),
    broadcaster_user_login: z.string(),
    broadcaster_user_name: z.string(),
    tier: z.string(),
    is_gift: z.boolean(),
  }),
});

/**
 * Channel cheer (bits) event
 */
export const ChannelCheerEventSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.literal("channel.cheer"),
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
    is_anonymous: z.boolean(),
    user_id: z.string().nullable(),
    user_login: z.string().nullable(),
    user_name: z.string().nullable(),
    broadcaster_user_id: z.string(),
    broadcaster_user_login: z.string(),
    broadcaster_user_name: z.string(),
    message: z.string(),
    bits: z.number(),
  }),
});

/**
 * Twitch API client
 */
export class TwitchClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID!;
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Twitch credentials are not set");
    }
  }

  /**
   * Get app access token
   * SECURITY: Validates token expiration and refreshes when needed
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token that hasn't expired
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > Date.now()) {
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
    if (!data.access_token) {
      throw new Error("No access token received from Twitch");
    }

    this.accessToken = data.access_token;
    // Set expiration time (Twitch tokens typically last 60 days)
    // Subtract 5 minutes for safety margin
    const expiresIn = data.expires_in || 5184000; // Default 60 days in seconds
    this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

    return data.access_token;
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

  /**
   * Get user information (includes total view count)
   */
  async getUser(userId: string): Promise<{
    id: string;
    login: string;
    display_name: string;
    type: string;
    broadcaster_type: string;
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    created_at: string;
  } | null> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.twitch.tv/helix/users?id=${userId}`,
      {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get user information");
    }

    const data = await response.json();
    return data.data[0] || null;
  }

  /**
   * Get channel followers count and recent followers
   */
  async getChannelFollowers(
    userId: string,
    userAccessToken: string
  ): Promise<{
    total: number;
    followers: Array<{
      user_id: string;
      user_login: string;
      user_name: string;
      followed_at: string;
    }>;
  }> {
    const response = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=20`,
      {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${userAccessToken}`, // Requires user access token
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get channel followers");
    }

    const data = await response.json();
    return {
      total: data.total,
      followers: data.data,
    };
  }

  /**
   * Get clips created during a time period
   */
  async getClips(
    broadcasterId: string,
    startedAt?: string,
    endedAt?: string
  ): Promise<{
    clips: Array<{
      id: string;
      url: string;
      embed_url: string;
      broadcaster_id: string;
      broadcaster_name: string;
      creator_id: string;
      creator_name: string;
      video_id: string;
      game_id: string;
      language: string;
      title: string;
      view_count: number;
      created_at: string;
      thumbnail_url: string;
      duration: number;
    }>;
  }> {
    const token = await this.getAccessToken();

    let url = `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}`;
    if (startedAt) url += `&started_at=${startedAt}`;
    if (endedAt) url += `&ended_at=${endedAt}`;
    url += "&first=100";

    const response = await fetch(url, {
      headers: {
        "Client-ID": this.clientId,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get clips");
    }

    const data = await response.json();
    return { clips: data.data };
  }

  /**
   * Get channel information (includes game/category)
   */
  async getChannel(broadcasterId: string): Promise<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    broadcaster_language: string;
    game_id: string;
    game_name: string;
    title: string;
    delay: number;
    tags: string[];
  } | null> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`,
      {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get channel information");
    }

    const data = await response.json();
    return data.data[0] || null;
  }

  /**
   * Get videos (VODs) for a user
   */
  async getVideos(
    userId: string,
    type: "archive" | "highlight" | "upload" = "archive"
  ): Promise<{
    videos: Array<{
      id: string;
      stream_id: string;
      user_id: string;
      user_login: string;
      user_name: string;
      title: string;
      description: string;
      created_at: string;
      published_at: string;
      url: string;
      thumbnail_url: string;
      viewable: string;
      view_count: number;
      language: string;
      type: string;
      duration: string;
    }>;
  }> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${userId}&type=${type}&first=20`,
      {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get videos");
    }

    const data = await response.json();
    return { videos: data.data };
  }

  /**
   * Get subscription events for analytics
   * Note: Requires channel:read:subscriptions scope
   */
  async getSubscriptions(
    broadcasterId: string,
    userAccessToken: string
  ): Promise<{
    total: number;
    points: number;
    subscriptions: Array<{
      broadcaster_id: string;
      broadcaster_login: string;
      broadcaster_name: string;
      gifter_id?: string;
      gifter_login?: string;
      gifter_name?: string;
      is_gift: boolean;
      tier: string;
      plan_name: string;
      user_id: string;
      user_name: string;
      user_login: string;
    }>;
  }> {
    const response = await fetch(
      `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}`,
      {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${userAccessToken}`, // Requires broadcaster's access token
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get subscriptions");
    }

    const data = await response.json();
    return {
      total: data.total,
      points: data.points,
      subscriptions: data.data,
    };
  }
}

/**
 * SECURITY: Validate Twitch CDN URL to prevent SSRF attacks
 * Only allows official Twitch CDN domains with HTTPS
 */
const ALLOWED_TWITCH_CDN_DOMAINS = new Set([
  "static-cdn.jtvnw.net",    // Primary Twitch thumbnail CDN
  "vod-secure.twitch.tv",     // VOD thumbnails
  "vod-metro.twitch.tv",      // Metro VOD thumbnails
]);

export function isTwitchCDNUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // SECURITY: Only allow HTTPS protocol
    if (parsed.protocol !== "https:") return false;
    // SECURITY: Check domain whitelist
    return ALLOWED_TWITCH_CDN_DOMAINS.has(parsed.hostname.toLowerCase());
  } catch {
    // Invalid URL format
    return false;
  }
}
