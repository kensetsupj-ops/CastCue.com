import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generate HTML with OGP meta tags for social media previews
 */
function generateOGPHtml(params: {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
}): string {
  const { title, description, image, url, siteName } = params;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:url" content="${escapeHtml(url)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <!-- Auto-redirect after 1 second -->
  <meta http-equiv="refresh" content="1;url=${escapeHtml(url)}">
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(url)}">${escapeHtml(siteName)}</a>...</p>
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * GET /l/[shortCode]
 * Short URL redirect with click tracking
 *
 * For social media crawlers (Twitter, Facebook), returns OGP meta tags
 * For regular users, performs immediate redirect
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    // Look up the short code in the database with stream information
    const { data: link, error } = await supabaseAdmin
      .from("links")
      .select(`
        id,
        target_url,
        user_id,
        stream_id,
        has_media,
        streams (
          id,
          title,
          user_id,
          twitch_accounts (
            display_name,
            profile_image_url,
            broadcaster_login
          )
        )
      `)
      .eq("short_code", shortCode)
      .single();

    if (error || !link) {
      // Short code not found - return 404
      return new NextResponse("Not Found", { status: 404 });
    }

    // Validate target URL to prevent open redirect vulnerability
    // Only allow Twitch URLs and same-origin URLs
    const allowedDomains = [
      "twitch.tv",
      "www.twitch.tv",
      "m.twitch.tv",
    ];

    try {
      const targetUrl = new URL(link.target_url);
      const appOrigin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN) : null;

      // Check if URL is from an allowed domain
      const isAllowedDomain = allowedDomains.some(domain =>
        targetUrl.hostname === domain || targetUrl.hostname.endsWith(`.${domain}`)
      );

      // Check if URL is same-origin (optional, for internal redirects)
      const isSameOrigin = appOrigin && targetUrl.origin === appOrigin.origin;

      if (!isAllowedDomain && !isSameOrigin) {
        console.error(`Blocked redirect to unauthorized domain: ${targetUrl.hostname}`);
        return new NextResponse("Invalid redirect target", { status: 400 });
      }
    } catch (urlError) {
      console.error("Invalid target URL format:", urlError);
      return new NextResponse("Invalid URL format", { status: 400 });
    }

    // Extract click metadata
    // SECURITY: Limit header sizes to prevent database storage exhaustion
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || undefined;
    const referrer = req.headers.get("referer")?.slice(0, 2000) || undefined;

    // Check if this is a social media crawler
    const isCrawler = userAgent && (
      userAgent.includes("Twitterbot") ||
      userAgent.includes("facebookexternalhit") ||
      userAgent.includes("LinkedInBot") ||
      userAgent.includes("Slackbot")
    );

    // For crawlers, return OGP meta tags for rich previews
    // Skip OGP if has_media is true (image attachment takes priority over OGP card)
    if (isCrawler && !link.has_media && link.stream_id && link.streams) {
      const stream = Array.isArray(link.streams) ? link.streams[0] : link.streams;
      const twitchAccount = Array.isArray(stream.twitch_accounts)
        ? stream.twitch_accounts[0]
        : stream.twitch_accounts;

      // Generate OGP HTML
      const html = generateOGPHtml({
        title: stream.title || "Twitch配信",
        description: `${twitchAccount?.display_name || "配信者"}の配信を視聴`,
        image: twitchAccount?.profile_image_url || "",
        url: link.target_url,
        siteName: "Twitch",
      });

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        },
      });
    }

    // Record the click asynchronously (don't wait for it to complete)
    // This ensures the redirect is fast
    (async () => {
      try {
        await supabaseAdmin
          .from("clicks")
          .insert({
            link_id: link.id,
            ua: userAgent,
            referrer: referrer,
            at: new Date().toISOString(),
          });
        console.log(`Click recorded for short code: ${shortCode}`);
      } catch (error) {
        console.error("Failed to record click:", error);
        // Don't fail the redirect if click tracking fails
      }
    })();

    // Redirect to the target URL immediately
    return NextResponse.redirect(link.target_url, { status: 302 });
  } catch (error) {
    console.error("Short URL redirect error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
