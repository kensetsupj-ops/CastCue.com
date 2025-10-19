import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isAdmin, verifyAdminPassword } from "@/lib/admin";
import { getAllStats } from "@/lib/admin-stats";
import { checkRateLimit } from "@/lib/ratelimit";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * Rate limit config for admin endpoints
 * Stricter than default due to expensive queries
 */
const ADMIN_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
};

/**
 * GET /api/admin/stats
 * Retrieve admin statistics
 *
 * Security (3-tier authentication):
 * - Tier 1: Supabase Auth (401 if not authenticated)
 * - Tier 2: Admin email/UUID check (403 if not admin)
 * - Tier 3: Admin password verification (403 if incorrect)
 * - Rate limited to 10 requests/min
 *
 * Headers:
 * - X-Admin-Password: Admin password (required)
 *
 * Response:
 * - 200 OK: { users, growth, activity, health }
 * - 401 Unauthorized: Not authenticated
 * - 403 Forbidden: Not an admin or invalid password
 * - 429 Too Many Requests: Rate limit exceeded
 * - 500 Internal Server Error: Server error
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[admin/stats] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tier 2: Admin authorization check (email/UUID)
    const userIsAdmin = await isAdmin(user.id);

    if (!userIsAdmin) {
      console.warn(`[admin/stats] Non-admin user ${user.id} attempted access`);
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Tier 3: Admin password verification
    const adminPassword = req.headers.get("X-Admin-Password");
    const passwordValid = await verifyAdminPassword(adminPassword);

    if (!passwordValid) {
      console.warn(
        `[admin/stats] Admin user ${user.id} provided invalid password`
      );
      return NextResponse.json(
        { error: "Forbidden - Invalid admin password" },
        { status: 403 }
      );
    }

    // Rate limiting check
    const rateLimitResponse = await checkRateLimit(req, user.id, ADMIN_RATE_LIMIT);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    console.log(`[admin/stats] Admin ${user.id} fetching statistics`);

    // Fetch all statistics
    const stats = await getAllStats();

    return NextResponse.json(stats, { status: 200 });
  } catch (error: any) {
    console.error("[admin/stats] Error fetching statistics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
