import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF Protection Middleware
 *
 * Validates that state-changing requests (POST, PUT, DELETE, PATCH)
 * come from our own domain by checking the Origin header.
 *
 * This prevents Cross-Site Request Forgery attacks where malicious sites
 * attempt to make authenticated requests on behalf of logged-in users.
 *
 * @param req - The Next.js request object
 * @returns NextResponse with 403 error if CSRF check fails, null if check passes
 */
export function validateCSRF(req: NextRequest): NextResponse | null {
  const method = req.method;

  // Only check state-changing methods
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return null; // GET and HEAD are safe, no CSRF check needed
  }

  // Get the Origin and Referer headers
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Get allowed origins
  const appOrigin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL;
  const allowedOrigins = [
    appOrigin,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    // Allow localhost for development
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
    process.env.NODE_ENV === "development" ? "http://localhost:3010" : null,
  ].filter(Boolean) as string[];

  // Check Origin header first (most reliable)
  if (origin) {
    const isAllowed = allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        const originUrl = new URL(origin);
        return allowedUrl.origin === originUrl.origin;
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      console.error(`CSRF: Blocked request from unauthorized origin: ${origin}`);
      return NextResponse.json(
        { error: "CSRF validation failed: Invalid origin" },
        { status: 403 }
      );
    }

    return null; // CSRF check passed
  }

  // Fallback to Referer header if Origin is not present
  if (referer) {
    const isAllowed = allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        const refererUrl = new URL(referer);
        return refererUrl.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      console.error(`CSRF: Blocked request from unauthorized referer: ${referer}`);
      return NextResponse.json(
        { error: "CSRF validation failed: Invalid referer" },
        { status: 403 }
      );
    }

    return null; // CSRF check passed
  }

  // Special case: Allow requests without Origin/Referer for webhooks and cron jobs
  // These should have their own authentication mechanism
  const pathname = req.nextUrl.pathname;
  const isWebhook = pathname.startsWith("/api/twitch/webhook") ||
                    pathname.startsWith("/api/webhooks/");
  const isCron = pathname.startsWith("/api/cron/");

  if (isWebhook || isCron) {
    return null; // Allow these, they have their own auth
  }

  // No Origin or Referer header - potential CSRF attack
  console.error(`CSRF: Blocked request without Origin or Referer header to ${pathname}`);
  return NextResponse.json(
    { error: "CSRF validation failed: Missing origin header" },
    { status: 403 }
  );
}

/**
 * Exempts specific paths from CSRF protection
 * Use this for webhooks and other external integrations that have their own auth
 */
export function isCSRFExempt(pathname: string): boolean {
  const exemptPaths = [
    "/api/twitch/webhook",
    "/api/webhooks/",
    "/api/cron/",
    "/api/x/oauth/callback", // OAuth callback from X
    "/api/auth/callback", // Supabase auth callback
  ];

  return exemptPaths.some(path => pathname.startsWith(path));
}
