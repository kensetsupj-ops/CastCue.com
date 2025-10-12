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

    // Extract click metadata
    const userAgent = req.headers.get("user-agent") || undefined;
    const referrer = req.headers.get("referer") || undefined;

    // Record the click asynchronously (don't wait for it to complete)
    // This ensures the redirect is fast
    supabaseAdmin
      .from("clicks")
      .insert({
        link_id: link.id,
        ua: userAgent,
        referrer: referrer,
        at: new Date().toISOString(),
      })
      .then(() => {
        console.log(`Click recorded for short code: ${shortCode}`);
      })
      .catch((error) => {
        console.error("Failed to record click:", error);
        // Don't fail the redirect if click tracking fails
      });

    // Redirect to the target URL immediately
    return NextResponse.redirect(link.target_url, { status: 302 });
  } catch (error) {
    console.error("Short URL redirect error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
