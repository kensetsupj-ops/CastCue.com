import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

const SetDefaultTemplateSchema = z.object({
  template_id: z.string().uuid(),
});

/**
 * Set default template for user
 * POST /api/settings/default-template
 */
export async function POST(req: NextRequest) {
  try {
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { template_id } = SetDefaultTemplateSchema.parse(body);

    // Verify template ownership
    const { data: template, error: templateError } = await supabaseAdmin
      .from("templates")
      .select("id")
      .eq("id", template_id)
      .eq("user_id", user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found or not owned by user" },
        { status: 404 }
      );
    }

    // Update user settings
    const { error: updateError } = await supabaseAdmin
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          default_template_id: template_id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (updateError) {
      console.error("Failed to update default template:", updateError);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in POST /api/settings/default-template:", error);

    if (error.issues) {
      return NextResponse.json(
        { error: "Invalid template_id format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get default template for user
 * GET /api/settings/default-template
 */
export async function GET(req: NextRequest) {
  try {
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("user_settings")
      .select("default_template_id")
      .eq("user_id", user.id)
      .single();

    if (settingsError) {
      if (settingsError.code === "PGRST116") {
        // No settings found, return null
        return NextResponse.json({ default_template_id: null });
      }

      console.error("Failed to get default template:", settingsError);
      return NextResponse.json(
        { error: "Failed to get settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      default_template_id: settings?.default_template_id || null,
    });
  } catch (error: any) {
    console.error("Error in GET /api/settings/default-template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}