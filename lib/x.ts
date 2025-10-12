import { z } from "zod";
import { encrypt, decrypt } from "./crypto";
import { supabaseAdmin } from "./db";

/**
 * X (Twitter) OAuth2 configuration
 */
const X_OAUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_API_URL = "https://api.twitter.com/2";
const X_UPLOAD_URL = "https://upload.twitter.com/1.1"; // For media upload

/**
 * OAuth2 PKCE code verifier and challenge generation
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate OAuth2 authorization URL
 */
export async function getAuthorizationUrl(
  state: string,
  codeVerifier: string
): Promise<string> {
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: process.env.X_REDIRECT_URI!,
    scope: "tweet.write tweet.read users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${X_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
}> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.X_REDIRECT_URI!,
    code_verifier: codeVerifier,
    client_id: process.env.X_CLIENT_ID!,
  });

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    scope: data.scope.split(" "),
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.X_CLIENT_ID!,
  });

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

/**
 * Get user's access token (decrypt from database)
 */
export async function getUserAccessToken(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("x_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("X connection not found");
  }

  // Check if token is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Refresh token
    const decryptedRefreshToken = decrypt(data.refresh_token_cipher!);
    const tokens = await refreshAccessToken(decryptedRefreshToken);

    // Update database
    await supabaseAdmin
      .from("x_connections")
      .update({
        access_token_cipher: encrypt(tokens.access_token),
        refresh_token_cipher: encrypt(tokens.refresh_token),
        expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
      })
      .eq("user_id", userId);

    return tokens.access_token;
  }

  return decrypt(data.access_token_cipher);
}

/**
 * Upload media (image) to X
 * Uses X API v1.1 Media Upload endpoint
 *
 * @param accessToken - User's access token
 * @param imageBuffer - Image buffer (from file upload)
 * @param mimeType - Image MIME type (image/jpeg, image/png, image/gif)
 * @returns Media ID string
 */
export async function uploadMedia(
  accessToken: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  // Convert buffer to base64
  const base64Image = imageBuffer.toString("base64");

  // Create form data
  const formData = new FormData();
  formData.append("media_data", base64Image);
  formData.append("media_category", "tweet_image");

  const response = await fetch(`${X_UPLOAD_URL}/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload media: ${error}`);
  }

  const data = await response.json();

  return data.media_id_string;
}

/**
 * Post a tweet
 *
 * @param accessToken - User's access token
 * @param text - Tweet text
 * @param mediaIds - Optional array of media IDs (from uploadMedia)
 * @returns Tweet data
 */
export async function postTweet(
  accessToken: string,
  text: string,
  mediaIds?: string[]
): Promise<{ id: string; text: string }> {
  const body: any = { text };

  if (mediaIds && mediaIds.length > 0) {
    body.media = {
      media_ids: mediaIds,
    };
  }

  const response = await fetch(`${X_API_URL}/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post tweet: ${error}`);
  }

  const data = await response.json();

  return {
    id: data.data.id,
    text: data.data.text,
  };
}

/**
 * Get current user info
 */
export async function getCurrentUser(
  accessToken: string
): Promise<{ id: string; username: string; name: string }> {
  const response = await fetch(`${X_API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const data = await response.json();

  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
  };
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

/**
 * Get user's following list (accounts they follow)
 * Used for @mention autocomplete
 *
 * @param accessToken - User's access token
 * @param userId - User ID to get following list for
 * @param maxResults - Maximum number of results (default: 100, max: 1000)
 * @returns Array of users
 */
export async function getFollowing(
  accessToken: string,
  userId: string,
  maxResults: number = 100
): Promise<XUser[]> {
  const params = new URLSearchParams({
    "user.fields": "id,username,name,profile_image_url",
    max_results: Math.min(maxResults, 1000).toString(),
  });

  const response = await fetch(
    `${X_API_URL}/users/${userId}/following?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get following list: ${error}`);
  }

  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    return [];
  }

  return data.data.map((user: any) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    profile_image_url: user.profile_image_url,
  }));
}
