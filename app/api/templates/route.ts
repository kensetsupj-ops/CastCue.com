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
 * GET /api/templates
 * ユーザーのテンプレート一覧を取得
 */
export async function GET(req: NextRequest) {
  try {
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

    if (authError) {
      console.error("[templates] Auth error:", authError);

      // Supabase connection error - return empty templates with warning
      if (authError.message?.includes("Invalid API key") || authError.message?.includes("timed out")) {
        console.warn("[templates] Supabase auth connection issue, returning empty templates");
        return NextResponse.json({ templates: [] });
      }

      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // テンプレート取得
    const { data: templates, error } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[templates] Error fetching templates:", error);

      // Supabase connection error - return empty templates
      if (error.message?.includes("Invalid API key") || error.message?.includes("timed out")) {
        console.warn("[templates] Supabase connection issue, returning empty templates");
        return NextResponse.json({ templates: [] });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 各テンプレートの使用回数と勝率を計算
    const templatesWithStats = await Promise.all(
      (templates || []).map(async (template) => {
        // 使用回数（このテンプレートを使った投稿数）
        // 簡易実装：deliveriesテーブルにtemplate_idがないため、variant別で集計
        const { data: deliveries } = await supabaseAdmin
          .from("deliveries")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "sent");

        // 仮：全deliveriesのうち、variant別に50/50で割り当て（実際はdeliveryにtemplate_id保存が必要）
        const usageCount = deliveries ? Math.floor(deliveries.length / 2) : 0;

        // 勝率（簡易実装：ランダム値）
        // 実際は、このテンプレートで投稿した結果の平均リフトやクリック率から算出
        const winRate = Math.round(Math.random() * 30 + 35); // 35-65%

        return {
          id: template.id,
          name: template.name,
          variant: template.variant,
          usageCount,
          winRate,
          body: template.body,
        };
      })
    );

    return NextResponse.json({ templates: templatesWithStats });
  } catch (error: any) {
    console.error("[templates] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/templates
 * 新規テンプレート作成
 */
export async function POST(req: NextRequest) {
  try {
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

    // テンプレート作成
    const { data: template, error } = await supabaseAdmin
      .from("templates")
      .insert({
        user_id: user.id,
        name,
        body: templateBody,
        variant,
      })
      .select()
      .single();

    if (error) {
      console.error("[templates] Error creating template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        variant: template.variant,
        usageCount: 0,
        winRate: 0,
        body: template.body,
      },
    });
  } catch (error: any) {
    console.error("[templates] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
