import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { getUserAccessToken, postTweet } from "@/lib/x";
import { sendStreamNotification } from "@/lib/discord";
import { consumeQuota, getQuota, shouldFallbackToDiscord } from "@/lib/quota";
import { generateShortCode } from "@/lib/utils";
import { hash } from "@/lib/crypto";

const DispatchRequestSchema = z.object({
  user_id: z.string().uuid(),
  stream_id: z.number(),
  title: z.string(),
  twitch_url: z.string().url(),
});

/**
 * Dispatch notification to X and/or Discord
 * POST /api/dispatch
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, stream_id, title, twitch_url } = DispatchRequestSchema.parse(body);

    const startTime = Date.now();

    // Get quota information
    const quota = await getQuota(user_id);

    // Determine if we should fallback to Discord only
    const useFallback = shouldFallbackToDiscord(quota);

    // Generate short URL
    const shortCode = generateShortCode();
    const { data: link } = await supabaseAdmin
      .from("links")
      .insert({
        user_id,
        short_code: shortCode,
        target_url: twitch_url,
      })
      .select("*")
      .single();

    const shortUrl = `${process.env.APP_ORIGIN}/l/${shortCode}`;

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
            idempotency_key,
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
