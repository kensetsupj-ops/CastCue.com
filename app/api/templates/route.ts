import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { ApiErrors } from "@/lib/api-errors";
import { getAuthUser } from "@/lib/api-auth";

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
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return ApiErrors.notAuthenticated();
    }

    // テンプレート一覧を取得
    const { data: templates, error } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[templates] Database error:", error);
      return ApiErrors.serverError(error, false);
    }

    // カテゴリと使用回数は後で実装
    const formattedTemplates = templates?.map((template) => ({
      id: template.id,
      name: template.name || "無題のテンプレート",
      category: "一般",
      usageCount: 0,
      avgCalledViewers: 0,
      body: template.body || "",
    })) || [];

    return NextResponse.json({ templates: formattedTemplates });
  } catch (error: any) {
    console.error("[templates] Unexpected error:", error);
    return ApiErrors.serverError(error, false);
  }
}

/**
 * POST /api/templates
 * 新しいテンプレートを作成
 */
export async function POST(req: NextRequest) {
  try {
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return ApiErrors.notAuthenticated();
    }

    const body = await req.json();

    // バリデーション
    const result = TemplateSchema.safeParse(body);
    if (!result.success) {
      return ApiErrors.validationError(
        result.error.issues.map((e) => e.message).join(", ")
      );
    }

    const { name, body: templateBody } = result.data;

    // テンプレートを作成
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
      console.error("[templates] Database error:", error);

      // Unique constraint violation
      if (error.code === "23505") {
        return ApiErrors.conflict("同じ名前のテンプレートが既に存在します");
      }

      return ApiErrors.serverError(error, false);
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error("[templates] Unexpected error:", error);
    return ApiErrors.serverError(error, false);
  }
}

/**
 * PUT /api/templates
 * テンプレートを更新
 */
export async function PUT(req: NextRequest) {
  try {
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return ApiErrors.notAuthenticated();
    }

    const body = await req.json();
    const { id, name, body: templateBody } = body;

    if (!id) {
      return ApiErrors.badRequest("テンプレートIDが必要です");
    }

    // バリデーション
    const result = TemplateSchema.safeParse({ name, body: templateBody });
    if (!result.success) {
      return ApiErrors.validationError(
        result.error.issues.map((e) => e.message).join(", ")
      );
    }

    // テンプレートの所有者確認と更新
    const { data: template, error } = await supabaseAdmin
      .from("templates")
      .update({
        name: result.data.name,
        body: result.data.body,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[templates] Database error:", error);

      if (error.code === "PGRST116") {
        return ApiErrors.notFound("テンプレートが見つかりません");
      }

      return ApiErrors.serverError(error, false);
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("[templates] Unexpected error:", error);
    return ApiErrors.serverError(error, false);
  }
}

/**
 * DELETE /api/templates
 * テンプレートを削除
 */
export async function DELETE(req: NextRequest) {
  try {
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return ApiErrors.notAuthenticated();
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiErrors.badRequest("テンプレートIDが必要です");
    }

    // テンプレートの所有者確認と削除
    const { error } = await supabaseAdmin
      .from("templates")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[templates] Database error:", error);

      if (error.code === "PGRST116") {
        return ApiErrors.notFound("テンプレートが見つかりません");
      }

      return ApiErrors.serverError(error, false);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[templates] Unexpected error:", error);
    return ApiErrors.serverError(error, false);
  }
}