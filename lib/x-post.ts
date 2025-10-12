import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Encryption key for X tokens (must be 32 bytes for AES-256)
 */
const ENCRYPTION_KEY = process.env.X_TOKEN_ENCRYPTION_KEY!;

/**
 * Encrypt token with AES-256-CBC
 */
function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );

  let encrypted = cipher.update(token, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Return as "iv:encrypted" format
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt X access token
 */
function decryptToken(encryptedToken: string): string {
  const [ivHex, encryptedHex] = encryptedToken.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Get user's X OAuth tokens
 */
async function getUserXTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("x_access_token, x_refresh_token")
    .eq("user_id", userId)
    .single();

  if (error || !profile?.x_access_token) {
    return null;
  }

  return {
    accessToken: decryptToken(profile.x_access_token),
    refreshToken: profile.x_refresh_token
      ? decryptToken(profile.x_refresh_token)
      : "",
  };
}

/**
 * Refresh X access token using refresh token
 */
async function refreshXToken(
  userId: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("X OAuth credentials not configured");
      return null;
    }

    // Base64 encode client credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    // Request new access token
    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to refresh X token:", error);
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || refreshToken;

    // Encrypt and update tokens in database
    const encryptedAccessToken = encryptToken(newAccessToken);
    const encryptedRefreshToken = encryptToken(newRefreshToken);

    await supabaseAdmin
      .from("profiles")
      .update({
        x_access_token: encryptedAccessToken,
        x_refresh_token: encryptedRefreshToken,
      })
      .eq("user_id", userId);

    console.log(`X token refreshed for user ${userId}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error("Error refreshing X token:", error);
    return null;
  }
}

/**
 * Generate short URL for click tracking
 */
async function generateShortUrl(
  userId: string,
  targetUrl: string
): Promise<string> {
  // Generate random short code (8 characters)
  const shortCode = crypto.randomBytes(4).toString("hex");

  // Insert into database
  const { error } = await supabaseAdmin.from("links").insert({
    user_id: userId,
    short_code: shortCode,
    target_url: targetUrl,
  });

  if (error) {
    console.error("Failed to create short URL:", error);
    // Return original URL if short URL creation fails
    return targetUrl;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://castcue.com";
  return `${baseUrl}/l/${shortCode}`;
}

/**
 * Replace template variables in text
 */
async function replaceTemplateVariables(
  template: string,
  variables: {
    title: string;
    twitch_url: string;
    category?: string;
    userId: string;
  }
): Promise<string> {
  let text = template;

  // Generate short URL for Twitch URL
  const shortUrl = await generateShortUrl(variables.userId, variables.twitch_url);

  // Replace variables
  text = text.replace(/\{title\}/g, variables.title);
  text = text.replace(/\{twitch_url\}/g, shortUrl);
  text = text.replace(/\{category\}/g, variables.category || "");

  return text;
}

/**
 * Post tweet to X (Twitter)
 */
async function postTweet(
  accessToken: string,
  text: string
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.detail || "Failed to post tweet",
      };
    }

    const data = await response.json();
    return {
      success: true,
      tweetId: data.data.id,
    };
  } catch (error) {
    console.error("Error posting tweet:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Post to X with template
 */
export async function postToX(
  userId: string,
  draftId: string,
  template: string,
  variables: {
    title: string;
    twitch_url: string;
    category?: string;
  }
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    // Get user's X tokens
    const tokens = await getUserXTokens(userId);
    if (!tokens) {
      return {
        success: false,
        error: "X account not connected",
      };
    }

    // Replace template variables
    const text = await replaceTemplateVariables(template, {
      ...variables,
      userId,
    });

    // Post tweet
    let result = await postTweet(tokens.accessToken, text);

    // If unauthorized, try refreshing token and retry once
    if (
      !result.success &&
      result.error?.includes("401") ||
      result.error?.includes("Unauthorized")
    ) {
      console.log("Access token expired, refreshing...");

      const refreshedTokens = await refreshXToken(
        userId,
        tokens.refreshToken
      );

      if (refreshedTokens) {
        // Retry with new token
        result = await postTweet(refreshedTokens.accessToken, text);
      } else {
        return {
          success: false,
          error: "Failed to refresh X token. Please reconnect your account.",
        };
      }
    }

    if (result.success && result.tweetId) {
      // Record post in database
      await supabaseAdmin.from("posts").insert({
        user_id: userId,
        draft_id: draftId,
        platform: "x",
        post_id: result.tweetId,
        content: text,
        posted_at: new Date().toISOString(),
      });
    }

    return result;
  } catch (error) {
    console.error("Error in postToX:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Post immediately with user's default template
 */
export async function postImmediatelyWithTemplate(
  userId: string,
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get draft details
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select("title, twitch_url, image_url")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return {
        success: false,
        error: "Draft not found",
      };
    }

    // Get user's default template
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("x_template")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.x_template) {
      return {
        success: false,
        error: "Default template not found",
      };
    }

    // Post to X
    const result = await postToX(userId, draftId, profile.x_template, {
      title: draft.title,
      twitch_url: draft.twitch_url,
    });

    if (result.success) {
      // Update draft status to posted
      await supabaseAdmin
        .from("drafts")
        .update({ status: "posted" })
        .eq("id", draftId);
    }

    return result;
  } catch (error) {
    console.error("Error in postImmediatelyWithTemplate:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
