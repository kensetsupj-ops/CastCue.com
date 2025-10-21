import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendDraftNotification } from "@/lib/push";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * Test push notification endpoint
 * POST /api/push/test
 *
 * ブラウザ通知のテスト用エンドポイント（認証済みユーザーのみ）
 */
export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // テスト通知を送信
    // NOTE: This endpoint is for testing push notifications only
    // The draft_id is a placeholder UUID that doesn't exist in the database
    const result = await sendDraftNotification(
      user.id,
      "00000000-0000-4000-8000-000000000000",
      "【テスト配信】CastCueの通知テスト中！",
      "https://twitch.tv/example"
    );

    console.log('[api/push/test] Test notification sent:', result);

    return NextResponse.json({
      success: true,
      message: "Test notification sent",
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error: any) {
    console.error("Test push notification error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
