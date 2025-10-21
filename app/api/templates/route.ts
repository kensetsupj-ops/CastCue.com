import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { ApiErrors } from "@/lib/api-errors";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

// SECURITY: Byte-level validation to prevent DoS via large Unicode strings
const validateByteSize = (val: string, maxBytes: number) => {
  const byteLength = new TextEncoder().encode(val).length;
  return byteLength <= maxBytes;
};

const TemplateSchema = z.object({
  name: z.string().min(1).max(100).refine(
    (val) => validateByteSize(val, 400),
    { message: "Template name exceeds byte limit (400 bytes)" }
  ),
  body: z.string().min(1).max(500).refine(
    (val) => validateByteSize(val, 2000),
    { message: "Template body exceeds byte limit (2000 bytes)" }
  ),
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

      return ApiErrors.notAuthenticated();
    }

    if (!user) {
      return ApiErrors.notAuthenticated();
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

      return ApiErrors.serverError(error, false);
    }

    // 各テンプレートの使用回数と統計を計算
    // PERFORMANCE: N+1クエリを回避 - 全deliveriesを1回のクエリで取得
    let usageCounts: Record<string, number> = {};

    if (templates && templates.length > 0) {
      const templateIds = templates.map(t => t.id);

      const { data: allDeliveries } = await supabaseAdmin
        .from("deliveries")
        .select("template_id")
        .eq("user_id", user.id)
        .eq("status", "sent")
        .in("template_id", templateIds);

      // template_id別にカウント
      if (allDeliveries) {
        usageCounts = allDeliveries.reduce((acc, delivery) => {
          const templateId = delivery.template_id;
          if (templateId) {
            acc[templateId] = (acc[templateId] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // テンプレートに統計情報を付加（非同期処理不要）
    const templatesWithStats = (templates || []).map((template) => {
      const usageCount = usageCounts[template.id] || 0;

      // 勝率（簡易実装：使用回数に基づく）
      // 詳細な勝率計算にはサンプリングデータが必要なため、
      // 今後の改善として使用回数をベースとした簡易値を表示
      const winRate = usageCount > 0 ? Math.min(Math.round((usageCount / 10) * 100), 100) : 0;

      return {
        id: template.id,
        name: template.name,
        usageCount,
        winRate,
        body: template.body,
      };
    });

    return NextResponse.json({ templates: templatesWithStats });
  } catch (error: any) {
    console.error("[templates] Error:", error);
    return ApiErrors.serverError(error, false);
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

    if (authError) {
      console.error("[templates] Auth error:", authError);
      return ApiErrors.unauthorized();
    }

    if (!user) {
      console.error("[templates] No user found in session");
      return ApiErrors.notAuthenticated();
    }

    // リクエストボディ取得
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("[templates] Request body:", {
        name: requestBody.name,
        bodyLength: requestBody.body?.length,
        variant: requestBody.variant
      });
    } catch (jsonError: any) {
      console.error("[templates] JSON parse error:", jsonError);
      return ApiErrors.badRequest("リクエストボディのJSON形式が不正です");
    }

    // バリデーション
    let validatedData;
    try {
      validatedData = TemplateSchema.parse(requestBody);
      console.log("[templates] Validation successful");
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error("[templates] Validation error:", validationError.issues);
        return NextResponse.json(
          {
            error: "Validation error",
            details: validationError.issues
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    const { name, body: templateBody } = validatedData;

    // テンプレート作成
    console.log("[templates] Creating template for user:", user.id);
    const { data: template, error } = await supabaseAdmin
      .from("templates")
      .insert({
        user_id: user.id,
        name,
        body: templateBody,
      })
      .select()
      .single();

    if (error) {
      console.error("[templates] Database error creating template:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({
        error: error.message || "Failed to create template"
      }, { status: 500 });
    }

    if (!template) {
      console.error("[templates] No template returned from database");
      return NextResponse.json({
        error: "Template created but not returned"
      }, { status: 500 });
    }

    console.log("[templates] Template created successfully:", template.id);
    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        usageCount: 0,
        winRate: 0,
        body: template.body,
      },
    });
  } catch (error: any) {
    console.error("[templates] Unexpected error:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error
    });

    return ApiErrors.serverError(error, false);
  }
}
