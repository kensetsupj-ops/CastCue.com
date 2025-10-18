import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SetDefaultTemplateSchema = z.object({
  template_id: z.string().uuid(),
});

/**
 * Set default template for user
 * POST /api/settings/default-template
 */
export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { template_id } = SetDefaultTemplateSchema.parse(body);

    // Verify template exists and belongs to user
    const { data: template, error: templateError } = await supabaseAdmin
      .from("templates")
      .select("id, user_id")
      .eq("id", template_id)
      .eq("user_id", user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Upsert user settings with default template
    const { error: upsertError } = await supabaseAdmin
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          default_template_id: template_id,
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("[default-template] Upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to set default template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Default template set successfully",
      template_id,
    });
  } catch (error: any) {
    console.error("[default-template] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Get current default template
 * GET /api/settings/default-template
 */
export async function GET(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("user_settings")
      .select("default_template_id")
      .eq("user_id", user.id)
      .single();

    if (settingsError) {
      // If no settings exist yet, return null
      return NextResponse.json({
        default_template_id: null,
      });
    }

    return NextResponse.json({
      default_template_id: settings.default_template_id,
    });
  } catch (error: any) {
    console.error("[default-template] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
