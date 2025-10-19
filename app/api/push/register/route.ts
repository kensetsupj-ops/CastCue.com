import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

// SECURITY: Whitelist allowed push notification endpoint domains
// Only allow endpoints from known, trusted push service providers
const ALLOWED_PUSH_DOMAINS = [
  "fcm.googleapis.com",                    // Firebase Cloud Messaging (Chrome, Android)
  "updates.push.services.mozilla.com",     // Mozilla Push Service (Firefox)
  "updates-autopush.stage.mozaws.net",     // Mozilla Push Service (Firefox staging)
  "updates-autopush.dev.mozaws.net",       // Mozilla Push Service (Firefox dev)
  "wns2-",                                 // Windows Push Notification Service (prefix match)
  "notify.windows.com",                    // Windows Push (legacy)
  "push.apple.com",                        // Apple Push Notification Service (Safari)
  "web.push.apple.com",                    // Apple Push (web)
];

// Schema for push subscription validation
const PushSubscriptionSchema = z.object({
  endpoint: z.string().url().refine(
    (url) => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Check if hostname matches any allowed domain (exact match or prefix)
        return ALLOWED_PUSH_DOMAINS.some(domain =>
          hostname === domain ||
          hostname.endsWith(`.${domain}`) ||
          (domain.endsWith("-") && hostname.startsWith(domain))  // Prefix match for wns2-*
        );
      } catch {
        return false;
      }
    },
    {
      message: "Push endpoint must be from a trusted push service provider (FCM, Mozilla Push, WNS, or APNs)"
    }
  ),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * POST /api/push/register
 * Register a push subscription for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    // Initialize Supabase Admin client inside the function
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const subscription = PushSubscriptionSchema.parse(body);

    // SECURITY: Limit push subscriptions to 5 devices per user
    const MAX_SUBSCRIPTIONS = 5;

    // Count existing subscriptions for this user
    const { count } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // If at limit, remove oldest subscription before adding new one
    if (count && count >= MAX_SUBSCRIPTIONS) {
      const { data: oldest } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (oldest) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", oldest.endpoint);
        console.log(`[push] Removed oldest subscription for user ${user.id}`);
      }
    }

    // Upsert the push subscription
    const { error: upsertError } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        {
          onConflict: "endpoint",
        }
      );

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      message: "Push subscription registered successfully",
    });
  } catch (error: any) {
    console.error("POST /api/push/register error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid subscription format", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to register push subscription" },
      { status: 500 }
    );
  }
}
