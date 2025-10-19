import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { getUserAccessToken, postTweet } from "@/lib/x";
import { sendStreamNotification } from "@/lib/discord";
import { consumeQuota, getQuota, shouldFallbackToDiscord } from "@/lib/quota";
import { generateShortCode } from "@/lib/utils";
import { hash } from "@/lib/crypto";
import { validateCSRF } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/ratelimit";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

const DispatchRequestSchema = z.object({
  stream_id: z.number(),
  title: z.string(),
  twitch_url: z.string().url(),
});

/**
 * Dispatch notification to X and/or Discord
 * POST /api/dispatch
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

    // Rate limiting (after authentication to use user ID)
    const rateLimitError = await checkRateLimit(req, user_id);
    if (rateLimitError) {
      return rateLimitError;
    }

    const body = await req.json();
    const { stream_id, title, twitch_url } = DispatchRequestSchema.parse(body);

    // Verify stream ownership (optional but recommended)
    const { data: stream, error: streamError } = await supabaseAdmin
      .from("streams")
      .select("user_id")
      .eq("id", stream_id)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    if (stream.user_id !== user_id) {
      return NextResponse.json(
        { error: "Unauthorized: Stream does not belong to user" },
        { status: 403 }
      );
    }

    const startTime = Date.now();

    // Get quota information
    const quota = await getQuota(user_id);

    // Determine if we should fallback to Discord only
    const useFallback = shouldFallbackToDiscord(quota);

    // SECURITY: Generate short URL with collision check
    const maxAttempts = 10;
    let shortCode: string;
    let link: any;

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      shortCode = generateShortCode();

      // Check if short code already exists
      const { data: existing } = await supabaseAdmin
        .from("links")
        .select("id")
        .eq("short_code", shortCode)
        .single();

      if (!existing) {
        // Short code is available, insert it
        const { data: insertedLink, error: insertError } = await supabaseAdmin
          .from("links")
          .insert({
            user_id,
            short_code: shortCode,
            target_url: twitch_url,
          })
          .select("*")
          .single();

        if (insertError) {
          // Race condition: another request inserted the same code
          // Try again with a new code
          continue;
        }

        link = insertedLink;
        break;
      }

      // Collision detected, loop will try again
      if (attempts === maxAttempts - 1) {
        throw new Error("Failed to generate unique short code after maximum attempts");
      }
    }

    const shortUrl = `${process.env.APP_ORIGIN}/l/${shortCode!}`;

    // Get template
    const { data: template } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const messageText = template
      ? renderTemplate(template.body, { title, twitch_url: shortUrl })
      : `🔴 配信開始！\n${title}\n${shortUrl}`;

    const idempotencyKey = hash(`${user_id}:${stream_id}`);

    let result: {
      status: "sent" | "failed" | "fallback";
      channel: "x" | "discord";
      post_id?: string;
      error?: string;
    } = {
      status: "failed",
      channel: "x",
    };

    // Try posting to X if not in fallback mode
    if (!useFallback && quota.can_post) {
      try {
        const canConsume = await consumeQuota(user_id);

        if (canConsume) {
          const accessToken = await getUserAccessToken(user_id);
          const tweet = await postTweet(accessToken, messageText);

          result = {
            status: "sent",
            channel: "x",
            post_id: tweet.id,
          };

          // Record delivery
          await supabaseAdmin.from("deliveries").insert({
            user_id,
            stream_id,
            channel: "x",
            status: "sent",
            idempotency_key: idempotencyKey,
            post_id: tweet.id,
            latency_ms: Date.now() - startTime,
          });
        } else {
          // Quota exceeded, fallback to Discord
          throw new Error("Quota exceeded");
        }
      } catch (error: any) {
        console.error("Failed to post to X:", error);
        result = {
          status: "fallback",
          channel: "discord",
          error: error.message,
        };

        // Record failed delivery
        await supabaseAdmin.from("deliveries").insert({
          user_id,
          stream_id,
          channel: "x",
          status: "failed",
          idempotency_key: `${idempotencyKey}:x`,
          error: error.message,
          latency_ms: Date.now() - startTime,
        });
      }
    } else {
      result = {
        status: "fallback",
        channel: "discord",
      };
    }

    // Fallback to Discord or if X failed
    if (result.status === "fallback" || useFallback) {
      try {
        await sendStreamNotification(user_id, title, shortUrl);

        result = {
          status: "sent",
          channel: "discord",
        };

        // Record delivery
        await supabaseAdmin.from("deliveries").insert({
          user_id,
          stream_id,
          channel: "discord",
          status: "sent",
          idempotency_key: `${idempotencyKey}:discord`,
          latency_ms: Date.now() - startTime,
        });
      } catch (error: any) {
        console.error("Failed to post to Discord:", error);

        result = {
          status: "failed",
          channel: "discord",
          error: error.message,
        };

        // Record failed delivery
        await supabaseAdmin.from("deliveries").insert({
          user_id,
          stream_id,
          channel: "discord",
          status: "failed",
          idempotency_key: `${idempotencyKey}:discord`,
          error: error.message,
          latency_ms: Date.now() - startTime,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Dispatch error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Render template with variables
 */
function renderTemplate(
  body: string,
  vars: { title: string; twitch_url: string; category?: string }
): string {
  return body
    .replace(/\{title\}/g, vars.title)
    .replace(/\{twitch_url\}/g, vars.twitch_url)
    .replace(/\{category\}/g, vars.category || "");
}
