import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF Protection Middleware
 *
 * Validates Origin and Referer headers for state-changing requests
 * to prevent Cross-Site Request Forgery attacks
 */
export function middleware(request: NextRequest) {
  const { method, url, headers } = request;
  const requestUrl = new URL(url);

  // SECURITY: Handle CORS preflight requests (OPTIONS)
  if (method === "OPTIONS") {
    const appOrigin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL;
    if (appOrigin) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": new URL(appOrigin).origin,
          "Access-Control-Allow-Methods": "POST, PUT, DELETE, PATCH, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
  }

  // Only check state-changing operations
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return NextResponse.next();
  }

  // Exempt webhook endpoints (they use cryptographic signature verification)
  const exemptPaths = [
    "/api/twitch/webhook",
    "/api/webhooks/twitch",
    "/api/x/oauth/callback", // OAuth callback uses state parameter validation
    "/auth/callback", // Supabase auth callback
  ];

  if (exemptPaths.some((path) => requestUrl.pathname === path)) {
    return NextResponse.next();
  }

  // Get allowed origin from environment
  const appOrigin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL;
  if (!appOrigin) {
    console.error("[CSRF] APP_ORIGIN not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const allowedOrigin = new URL(appOrigin).origin;

  // Check Origin header first (more reliable)
  const origin = headers.get("origin");
  if (origin) {
    if (origin !== allowedOrigin) {
      console.error("[CSRF] Invalid origin detected", {
        expected: allowedOrigin,
        received: origin,
        path: requestUrl.pathname,
        method,
      });
      return NextResponse.json(
        { error: "Invalid origin" },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // Fallback to Referer header
  const referer = headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin !== allowedOrigin) {
        console.error("[CSRF] Invalid referer detected", {
          expected: allowedOrigin,
          received: refererUrl.origin,
          path: requestUrl.pathname,
          method,
        });
        return NextResponse.json(
          { error: "Invalid referer" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    } catch (error) {
      console.error("[CSRF] Invalid referer URL", { referer });
      return NextResponse.json(
        { error: "Invalid referer" },
        { status: 403 }
      );
    }
  }

  // Neither Origin nor Referer present - potential CSRF attack
  // However, some legitimate requests (like Service Worker fetch) may not have these headers
  // For Service Worker requests, they should still pass because they come from same origin
  // and browser enforces same-origin policy

  // Allow requests from Service Worker (they have sec-fetch-site: same-origin)
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "none") {
    return NextResponse.next();
  }

  console.warn("[CSRF] Missing origin/referer headers", {
    path: requestUrl.pathname,
    method,
    userAgent: headers.get("user-agent"),
    fetchSite,
  });

  // SECURITY: Only allow bypassing CSRF check with explicit environment variable
  // Never use NODE_ENV for security decisions (it can be misconfigured in production)
  if (process.env.DISABLE_CSRF_CHECK === "true") {
    console.warn("[CSRF] CSRF check disabled via DISABLE_CSRF_CHECK env var");
    return NextResponse.next();
  }

  return NextResponse.json(
    { error: "Missing origin or referer header" },
    { status: 403 }
  );
}

export const config = {
  matcher: [
    /*
     * Match all API routes except:
     * - Static files (_next/static)
     * - Images (_next/image)
     * - Favicon and other public files
     */
    "/api/:path*",
  ],
};
