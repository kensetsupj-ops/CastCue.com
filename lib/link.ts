import { supabaseAdmin } from "./db";
import { generateShortCode } from "./utils";

/**
 * Create a short link
 */
export async function createShortLink(
  userId: string,
  targetUrl: string,
  campaignId?: string,
  streamId?: number,
  hasMedia?: boolean
): Promise<{ id: string; shortCode: string; shortUrl: string }> {
  let shortCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  // Try to generate a unique short code
  while (attempts < maxAttempts) {
    shortCode = generateShortCode();

    // Check if this code already exists
    const { data: existing } = await supabaseAdmin
      .from("links")
      .select("id")
      .eq("short_code", shortCode)
      .single();

    if (!existing) {
      // Code is unique, use it
      break;
    }

    attempts++;
  }

  if (attempts === maxAttempts) {
    throw new Error("Failed to generate unique short code");
  }

  // Create the link record
  const { data: link, error } = await supabaseAdmin
    .from("links")
    .insert({
      user_id: userId,
      short_code: shortCode!,
      target_url: targetUrl,
      campaign_id: campaignId,
      stream_id: streamId,
      has_media: hasMedia ?? false,
    })
    .select("id, short_code")
    .single();

  if (error || !link) {
    console.error("Failed to create short link:", error);
    throw new Error("Failed to create short link");
  }

  const shortUrl = `${process.env.APP_ORIGIN}/l/${link.short_code}`;

  return {
    id: link.id,
    shortCode: link.short_code,
    shortUrl,
  };
}

/**
 * Track a click on a short link
 */
export async function trackClick(
  linkId: string,
  userAgent: string | null,
  referrer: string | null
): Promise<void> {
  try {
    await supabaseAdmin.from("clicks").insert({
      link_id: linkId,
      ua: userAgent,
      referrer: referrer,
    });
  } catch (error) {
    console.error("Failed to track click:", error);
    // Don't throw - we don't want to break the redirect if tracking fails
  }
}

/**
 * Get link by short code
 */
export async function getLinkByShortCode(shortCode: string): Promise<{
  id: string;
  targetUrl: string;
} | null> {
  const { data: link } = await supabaseAdmin
    .from("links")
    .select("id, target_url")
    .eq("short_code", shortCode)
    .single();

  if (!link) {
    return null;
  }

  return {
    id: link.id,
    targetUrl: link.target_url,
  };
}

/**
 * Replace URLs in text with short links
 * Used to replace Twitch URLs with trackable short links before posting
 */
export async function replaceWithShortLink(
  userId: string,
  text: string,
  url: string,
  campaignId?: string,
  streamId?: number,
  hasMedia?: boolean
): Promise<{ text: string; linkId: string; shortUrl: string }> {
  const { id, shortCode, shortUrl } = await createShortLink(
    userId,
    url,
    campaignId,
    streamId,
    hasMedia
  );

  // Replace the URL in the text
  const newText = text.replace(url, shortUrl);

  return {
    text: newText,
    linkId: id,
    shortUrl,
  };
}
