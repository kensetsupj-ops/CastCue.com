import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * PRODUCTION: Upstash Redis-based distributed rate limiting
 * Works correctly in Vercel serverless environment
 */

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiters with different configurations
const rateLimiters = {
  // Standard rate limit: 100 requests per 15 minutes
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "15 m"),
    analytics: true,
    prefix: "ratelimit:standard",
  }),

  // Anonymous rate limit: 20 requests per 15 minutes
  anonymous: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "15 m"),
    analytics: true,
    prefix: "ratelimit:anonymous",
  }),
};

/**
 * Get client identifier (user ID or IP address)
 */
function getClientIdentifier(req: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address for anonymous users
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : realIp || "unknown";

  return `ip:${ip}`;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
}

/**
 * Check if request exceeds rate limit
 *
 * @param req - The Next.js request object
 * @param userId - Optional user ID (authenticated users get higher limits)
 * @param config - Optional custom rate limit configuration (not used with Upstash)
 * @returns NextResponse with 429 error if rate limit exceeded, null otherwise
 */
export async function checkRateLimit(
  req: NextRequest,
  userId?: string,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  try {
    // Get client identifier
    const identifier = getClientIdentifier(req, userId);

    // Select rate limiter based on authentication
    const limiter = userId ? rateLimiters.standard : rateLimiters.anonymous;

    // Check rate limit
    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);

      console.warn(
        `Rate limit exceeded for ${identifier}: ${limit} requests per window`
      );

      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(reset).toISOString(),
          },
        }
      );
    }

    return null; // Rate limit check passed
  } catch (error) {
    console.error("[Rate Limit] Error checking rate limit:", error);

    // SECURITY: Fail open to avoid blocking legitimate users due to Redis issues
    // Log the error and allow the request through
    console.warn(
      "[Rate Limit] Allowing request due to error - investigate immediately"
    );
    return null;
  }
}

/**
 * Get rate limit info for a client (useful for including in response headers)
 */
export async function getRateLimitInfo(
  req: NextRequest,
  userId?: string,
  config?: RateLimitConfig
): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
}> {
  try {
    const identifier = getClientIdentifier(req, userId);
    const limiter = userId ? rateLimiters.standard : rateLimiters.anonymous;

    const { limit, remaining, reset } = await limiter.limit(identifier);

    return {
      limit,
      remaining: Math.max(0, remaining),
      reset: new Date(reset),
    };
  } catch (error) {
    console.error("[Rate Limit] Error getting rate limit info:", error);

    // Return default values on error
    const maxRequests = userId ? 100 : 20;
    return {
      limit: maxRequests,
      remaining: maxRequests,
      reset: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    };
  }
}

/**
 * Exempts specific paths from rate limiting
 */
export function isRateLimitExempt(pathname: string): boolean {
  const exemptPaths = [
    "/api/twitch/webhook", // Twitch webhooks should not be rate limited
    "/api/webhooks/", // Other webhooks
    "/api/cron/", // Cron jobs
  ];

  return exemptPaths.some((path) => pathname.startsWith(path));
}
