import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

const UpdateTutorialSchema = z.object({
  tutorial_step: z.number().int().min(0).max(5),
  tutorial_completed: z.boolean().optional(),
});

/**
 * POST /api/tutorial/update
 * チュートリアルの進捗を更新
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tutorial_step, tutorial_completed } = UpdateTutorialSchema.parse(body);

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

    // user_settings を更新（upsert）
    const updateData: any = {
      tutorial_step,
    };

    if (tutorial_completed !== undefined) {
      updateData.tutorial_completed = tutorial_completed;
    }

    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...updateData,
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`[tutorial/update] Updated tutorial for user ${user.id}: step=${tutorial_step}, completed=${tutorial_completed}`);

    return NextResponse.json({
      success: true,
      tutorial_step: data.tutorial_step,
      tutorial_completed: data.tutorial_completed,
    });
  } catch (error: any) {
    console.error("[tutorial/update] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
