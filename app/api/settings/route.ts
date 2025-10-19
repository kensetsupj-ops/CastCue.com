import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";

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

    // Get user settings
    const { data: settings, error } = await supabaseAdmin
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      throw error;
    }

    // If no settings exist, return defaults
    if (!settings) {
      return NextResponse.json({
        settings: {
          default_template_id: null,
          grace_timer: 90,
          auto_action: "skip",
        },
      });
    }

    return NextResponse.json({
      settings: {
        default_template_id: settings.default_template_id,
        grace_timer: settings.grace_timer,
        auto_action: settings.auto_action,
      },
    });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Update user settings
 */
export async function PUT(req: NextRequest) {
  try {
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
    const validatedData = SettingsSchema.parse(body);

    // SECURITY: Verify template ownership if default_template_id is being set
    if (validatedData.default_template_id) {
      const { data: template, error: templateError } = await supabaseAdmin
        .from("templates")
        .select("id")
        .eq("id", validatedData.default_template_id)
        .eq("user_id", user.id)  // SECURITY: Verify template belongs to user
        .single();

      if (templateError || !template) {
        return NextResponse.json(
          { error: "Template not found or does not belong to you" },
          { status: 403 }
        );
      }
    }

    // Upsert settings (insert or update)
    const { error: upsertError } = await supabaseAdmin
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          ...validatedData,
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error: any) {
    console.error("PUT /api/settings error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
