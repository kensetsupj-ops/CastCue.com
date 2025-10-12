import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TemplateSchema = z.object({
  name: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  variant: z.enum(["A", "B"]),
});

/**
 * PUT /api/templates/[id]
 * テンプレート更新
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;

    // Supabase認証
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

    // リクエストボディ取得
    const body = await req.json();
    const { name, body: templateBody, variant } = TemplateSchema.parse(body);

    // テンプレート更新（user_idチェック付き）
    const { data: template, error } = await supabaseAdmin
      .from("templates")
      .update({
        name,
        body: templateBody,
        variant,
      })
      .eq("id", templateId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[templates/:id] Error updating template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        variant: template.variant,
        body: template.body,
      },
    });
  } catch (error: any) {
    console.error("[templates/:id] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/templates/[id]
 * テンプレート削除
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;

    // Supabase認証
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

    // テンプレート削除（user_idチェック付き）
    const { error } = await supabaseAdmin
      .from("templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[templates/:id] Error deleting template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[templates/:id] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
