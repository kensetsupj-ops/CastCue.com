import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";

const SkipTutorialSchema = z.object({
  reason: z.enum(["user_skip", "auto_skip"]).optional(),
});

/**
 * POST /api/tutorial/skip
 * チュートリアルをスキップ
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reason } = SkipTutorialSchema.parse(body);

    // Supabase Admin クライアントを初期化
    const supabaseAdmin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

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

    // user_settings を更新してスキップ状態を記録
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .upsert({
        user_id: user.id,
        tutorial_completed: true, // スキップもcompleted扱い
        tutorial_skipped_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`[tutorial/skip] Tutorial skipped for user ${user.id}: reason=${reason || 'user_skip'}`);

    return NextResponse.json({
      success: true,
      message: "Tutorial skipped successfully",
    });
  } catch (error: any) {
    console.error("[tutorial/skip] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
