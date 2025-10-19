import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * POST /api/push/cleanup
 *
 * 現在のブラウザ以外の古い購読を削除する
 * これにより、1ユーザー1デバイスの購読のみが残る
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentEndpoint } = body;

    if (!currentEndpoint) {
      return NextResponse.json(
        { error: "currentEndpoint is required" },
        { status: 400 }
      );
    }

    // Use admin client to delete subscriptions
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete all subscriptions for this user EXCEPT the current one
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .neq("endpoint", currentEndpoint)
      .select();

    if (error) {
      console.error("Failed to cleanup old subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to cleanup subscriptions" },
        { status: 500 }
      );
    }

    console.log(`Cleaned up ${data?.length || 0} old subscription(s) for user ${user.id}`);

    return NextResponse.json({
      success: true,
      removed: data?.length || 0,
      message: `Removed ${data?.length || 0} old subscription(s)`,
    });
  } catch (error: any) {
    console.error("POST /api/push/cleanup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cleanup subscriptions" },
      { status: 500 }
    );
  }
}
