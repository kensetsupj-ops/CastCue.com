import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

// Schema for settings validation
const SettingsSchema = z.object({
  default_template_id: z.string().uuid().nullable().optional(),
  grace_timer: z.number().int().min(30).max(300).optional(),
  auto_action: z.enum(["post", "skip"]).optional(),
});

/**
 * GET /api/settings
 * Retrieve user settings
 */
export async function GET(req: NextRequest) {
  try {
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user settings
    const { data: settings, error } = await supabaseAdmin
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error fetching settings:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    // Return default settings if none exist
    const responseData = settings || {
      grace_timer: 90,
      auto_action: "post",
      notify_game_change: true,
      game_change_cooldown: 600, // 10 minutes in seconds
      game_change_whitelist: []
    };

    return NextResponse.json({ settings: responseData });
  } catch (error) {
    console.error("Error in GET /api/settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Update user settings
 */
export async function PUT(req: NextRequest) {
  try {
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate request body (partial validation for specific fields)
    const validation = SettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error },
        { status: 400 }
      );
    }

    // Extract and process settings
    const settings = {
      grace_timer: body.grace_timer,
      auto_action: body.auto_action,
      notify_game_change: body.notify_game_change,
      game_change_cooldown: body.game_change_cooldown,
      game_change_whitelist: body.game_change_whitelist || []
    };

    // Upsert user settings
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating settings:", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("Error in PUT /api/settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}