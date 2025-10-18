import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";

/**
 * GET /api/tutorial/status
 * チュートリアルの進捗状態を取得
 */
export async function GET(req: NextRequest) {
  try {
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

    // ユーザー設定を取得
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("user_settings")
      .select("tutorial_completed, tutorial_step, tutorial_skipped_at, default_template_id")
      .eq("user_id", user.id)
      .single();

    // user_settingsレコードが存在しない場合は作成
    if (settingsError && settingsError.code === 'PGRST116') {
      const { data: newSettings } = await supabaseAdmin
        .from("user_settings")
        .insert({
          user_id: user.id,
          tutorial_completed: false,
          tutorial_step: 0,
        })
        .select("tutorial_completed, tutorial_step, tutorial_skipped_at")
        .single();

      if (!newSettings) {
        throw new Error("Failed to create user settings");
      }

      return NextResponse.json({
        tutorial_completed: false,
        tutorial_step: 0,
        tutorial_skipped_at: null,
        x_connected: false,
        push_enabled: false,
        templates_count: 0,
        default_template_set: false,
      });
    }

    if (settingsError) {
      throw settingsError;
    }

    // 各設定の完了状態をチェック
    // X連携状態
    const { data: xConnection } = await supabaseAdmin
      .from("x_connections")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const x_connected = !!xConnection;

    // プッシュ通知状態
    const { data: pushSubscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id);

    const push_enabled = pushSubscriptions && pushSubscriptions.length > 0;

    // テンプレート数
    const { count: templatesCount } = await supabaseAdmin
      .from("templates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const templates_count = templatesCount || 0;

    // デフォルトテンプレート設定状態
    const default_template_set = !!settings.default_template_id;

    return NextResponse.json({
      tutorial_completed: settings.tutorial_completed,
      tutorial_step: settings.tutorial_step,
      tutorial_skipped_at: settings.tutorial_skipped_at,
      x_connected,
      push_enabled,
      templates_count,
      default_template_set,
    });
  } catch (error: any) {
    console.error("[tutorial/status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
