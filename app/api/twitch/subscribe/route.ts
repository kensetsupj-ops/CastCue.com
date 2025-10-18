import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { TwitchClient } from "@/lib/twitch";
import { supabaseAdmin } from "@/lib/db";
import { validateCSRF } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/ratelimit";

const SubscribeRequestSchema = z.object({
  broadcaster_user_id: z.string(),
});

/**
 * Create Twitch EventSub subscription
 * POST /api/twitch/subscribe
 *
 * SECURITY: Requires authentication. Uses authenticated user's ID only.
 * CSRF protection enabled.
 */
export async function POST(req: NextRequest) {
  try {
    // CSRF protection
    const csrfError = validateCSRF(req);
    if (csrfError) {
      return csrfError;
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Use authenticated user's ID only
    const user_id = user.id;

    // Rate limiting
    const rateLimitError = checkRateLimit(req, user_id);
    if (rateLimitError) {
      return rateLimitError;
    }

    const body = await req.json();
    const { broadcaster_user_id } = SubscribeRequestSchema.parse(body);

    // Verify broadcaster ownership (optional but recommended)
    const { data: twitchAccount, error: twitchError } = await supabaseAdmin
      .from("twitch_accounts")
      .select("user_id")
      .eq("broadcaster_id", broadcaster_user_id)
      .single();

    if (twitchError || !twitchAccount) {
      return NextResponse.json(
        { error: "Twitch account not found" },
        { status: 404 }
      );
    }

    if (twitchAccount.user_id !== user_id) {
      return NextResponse.json(
        { error: "Unauthorized: Twitch account does not belong to user" },
        { status: 403 }
      );
    }

    const client = new TwitchClient();
    const callback = `${process.env.APP_ORIGIN}/api/twitch/webhook`;

    // Create subscription
    const subscription = await client.createSubscription(
      "stream.online",
      broadcaster_user_id,
      callback
    );

    // Store subscription record
    await supabaseAdmin.from("eventsub_subscriptions").insert({
      user_id,
      twitch_subscription_id: subscription.id,
      type: "stream.online",
      status: subscription.status,
    });

    return NextResponse.json({
      subscription_id: subscription.id,
      status: subscription.status,
    });
  } catch (error: any) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete Twitch EventSub subscription
 * DELETE /api/twitch/subscribe
 *
 * SECURITY: Requires authentication. Verifies subscription ownership.
 * CSRF protection enabled.
 */
export async function DELETE(req: NextRequest) {
  try {
    // CSRF protection
    const csrfError = validateCSRF(req);
    if (csrfError) {
      return csrfError;
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user_id = user.id;

    // Rate limiting
    const rateLimitError = checkRateLimit(req, user_id);
    if (rateLimitError) {
      return rateLimitError;
    }

    const subscription_id = req.nextUrl.searchParams.get("subscription_id");

    if (!subscription_id) {
      return NextResponse.json(
        { error: "subscription_id is required" },
        { status: 400 }
      );
    }

    // Verify subscription ownership
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("eventsub_subscriptions")
      .select("user_id")
      .eq("twitch_subscription_id", subscription_id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.user_id !== user_id) {
      return NextResponse.json(
        { error: "Unauthorized: Subscription does not belong to user" },
        { status: 403 }
      );
    }

    const client = new TwitchClient();
    await client.deleteSubscription(subscription_id);

    // Update database
    await supabaseAdmin
      .from("eventsub_subscriptions")
      .update({ status: "deleted" })
      .eq("twitch_subscription_id", subscription_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete subscription error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
