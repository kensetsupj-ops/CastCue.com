import { NextRequest, NextResponse } from "next/server";

/**
 * ⚠️⚠️⚠️ CRITICAL WARNING: NOT PRODUCTION-READY ⚠️⚠️⚠️
 *
 * この実装はVercelのサーバーレス環境では**効果がありません**。
 * 各リクエストが異なるインスタンスで処理されるため、Mapは共有されません。
 *
 * 【本番運用前に必須】: Upstash Redisへの移行が必要です
 *
 * セットアップガイド: docs/deployment/upstash-setup.md
 * 所要時間: 15分
 * コスト: 無料（10,000 commands/day）
 *
 * 影響を受けるエンドポイント:
 * - /api/drafts/auto-post (重複投稿リスク)
 * - /api/sampling (API乱用リスク)
 * - /api/dispatch
 * - /api/twitch/subscribe
 *
 * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
 *
 * Rate Limiting Middleware (IN-MEMORY - DEVELOPMENT ONLY)
 *
 * Implements a sliding window rate limiter to prevent API abuse.
 * Uses in-memory storage with automatic cleanup.
 *
 * Default limits:
 * - Authenticated users: 100 requests per 15 minutes
 * - Anonymous (by IP): 20 requests per 15 minutes
 */

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 30 minutes
const CLEANUP_INTERVAL = 30 * 60 * 1000;
let lastGlobalCleanup = Date.now();

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
};

const ANONYMOUS_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 requests per 15 minutes (stricter for anonymous)
};

/**
 * Clean up old timestamps from a rate limit entry
 */
function cleanupEntry(entry: RateLimitEntry, windowMs: number): void {
  const now = Date.now();
  const cutoff = now - windowMs;

  entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > cutoff);
  entry.lastCleanup = now;
}

/**
 * Perform global cleanup of the rate limit store
 */
function performGlobalCleanup(): void {
  const now = Date.now();

  if (now - lastGlobalCleanup > CLEANUP_INTERVAL) {
    // Remove entries that haven't been accessed in the last hour
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.lastCleanup < oneHourAgo || entry.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }

    lastGlobalCleanup = now;
  }
}

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
 * Check if request exceeds rate limit
 *
 * @param req - The Next.js request object
 * @param userId - Optional user ID (authenticated users get higher limits)
 * @param config - Optional custom rate limit configuration
 * @returns NextResponse with 429 error if rate limit exceeded, null otherwise
 */
export function checkRateLimit(
  req: NextRequest,
  userId?: string,
  config?: RateLimitConfig
): NextResponse | null {
  // Perform global cleanup periodically
  performGlobalCleanup();

  // Use custom config or default based on authentication status
  const rateLimitConfig = config || (userId ? DEFAULT_CONFIG : ANONYMOUS_CONFIG);
  const { windowMs, maxRequests } = rateLimitConfig;

  // Get client identifier
  const clientId = getClientIdentifier(req, userId);

  // Get or create rate limit entry
  let entry = rateLimitStore.get(clientId);

  if (!entry) {
    entry = {
      timestamps: [],
      lastCleanup: Date.now(),
    };
    rateLimitStore.set(clientId, entry);
  }

  // Clean up old timestamps
  cleanupEntry(entry, windowMs);

  // Check if limit is exceeded
  if (entry.timestamps.length >= maxRequests) {
    const oldestTimestamp = entry.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    console.warn(
      `Rate limit exceeded for ${clientId}: ${entry.timestamps.length}/${maxRequests} requests`
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
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(resetTime).toISOString(),
        },
      }
    );
  }

  // Record this request
  entry.timestamps.push(Date.now());

  return null; // Rate limit check passed
}

/**
 * Get rate limit info for a client (useful for including in response headers)
 */
export function getRateLimitInfo(
  req: NextRequest,
  userId?: string,
  config?: RateLimitConfig
): {
  limit: number;
  remaining: number;
  reset: Date;
} {
  const rateLimitConfig = config || (userId ? DEFAULT_CONFIG : ANONYMOUS_CONFIG);
  const { windowMs, maxRequests } = rateLimitConfig;

  const clientId = getClientIdentifier(req, userId);
  const entry = rateLimitStore.get(clientId);

  if (!entry) {
    return {
      limit: maxRequests,
      remaining: maxRequests,
      reset: new Date(Date.now() + windowMs),
    };
  }

  cleanupEntry(entry, windowMs);

  const remaining = Math.max(0, maxRequests - entry.timestamps.length);
  const oldestTimestamp = entry.timestamps[0] || Date.now();
  const reset = new Date(oldestTimestamp + windowMs);

  return {
    limit: maxRequests,
    remaining,
    reset,
  };
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
