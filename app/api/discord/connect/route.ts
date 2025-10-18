import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for Discord webhook URL validation
const DiscordWebhookSchema = z.object({
  webhook_url: z.string().url().refine(
    (url) => {
      try {
        const parsedUrl = new URL(url);
        return (
          parsedUrl.hostname === "discord.com" &&
          parsedUrl.pathname.startsWith("/api/webhooks/")
        );
      } catch {
        return false;
      }
    },
    {
      message: "Invalid Discord webhook URL. Must be a Discord webhook endpoint.",
    }
  ),
});

/**
 * POST /api/discord/connect
 * Registers a Discord webhook for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { webhook_url } = DiscordWebhookSchema.parse(body);

    // Test the webhook by sending a test message
    try {
      const testResponse = await fetch(webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "✅ CastCue Discord Webhook連携テスト成功！",
          embeds: [
            {
              title: "Webhook連携完了",
              description:
                "このWebhookは正常に動作しています。配信開始時に通知が送信されます。",
              color: 5814783, // Blue color
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      if (!testResponse.ok) {
        throw new Error("Webhook test failed");
      }
    } catch (error) {
      console.error("Discord webhook test error:", error);
      return NextResponse.json(
        {
          error:
            "Webhook URLの検証に失敗しました。URLが正しいか、Webhookが有効か確認してください。",
        },
        { status: 400 }
      );
    }

    // Store webhook in database
    const { error: upsertError } = await supabase
      .from("discord_webhooks")
      .upsert(
        {
          user_id: user.id,
          webhook_url: webhook_url,
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Discord webhook storage error:", upsertError);
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      message: "Discord webhook registered successfully",
    });
  } catch (error: any) {
    console.error("POST /api/discord/connect error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid webhook URL format",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to register Discord webhook" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/discord/connect
 * Get Discord webhook connection status
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("discord_webhooks")
      .select("webhook_url, created_at")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({
        connected: false,
      });
    }

    // Mask webhook URL for security (show only domain and last 6 characters)
    const url = new URL(data.webhook_url);
    const maskedUrl = `${url.origin}/...${data.webhook_url.substring(data.webhook_url.length - 6)}`;

    return NextResponse.json({
      connected: true,
      webhook_url: maskedUrl,
      created_at: data.created_at,
    });
  } catch (error: any) {
    console.error("GET /api/discord/connect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get connection status" },
      { status: 500 }
    );
  }
}
