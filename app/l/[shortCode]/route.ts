import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /l/[shortCode]
 * Short URL redirect with click tracking
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    // Look up the short code in the database
    const { data: link, error } = await supabaseAdmin
      .from("links")
      .select("id, target_url, user_id")
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
