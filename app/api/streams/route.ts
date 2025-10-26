import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/streams
 * ユーザーの配信履歴を取得
 */
export async function GET(req: NextRequest) {
  try {
    // カスタム認証ヘルパーを使用（Supabaseセッション＋カスタムセッション対応）
    const { user } = await getAuthUser(req);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 配信履歴を取得（samplesと一緒に）
    // Note: thumbnail_url might not exist in database yet
    const { data: streams, error: streamsError } = await supabaseAdmin
      .from("streams")
      .select("id, user_id, platform, stream_id, started_at, ended_at_est, peak, samples(*)")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(50);

    if (streamsError) {
      throw streamsError;
    }

    // 各配信のデータを集計
    const streamsWithStats = (streams || []).map((stream) => {
      const samples = stream.samples || [];

      // 配信時間を計算
      const startedAt = new Date(stream.started_at);
      const endedAt = stream.ended_at_est
        ? new Date(stream.ended_at_est)
        : new Date(); // 配信中の場合は現在時刻

      const durationMs = endedAt.getTime() - startedAt.getTime();
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const duration = durationHours > 0
        ? `${durationHours}時間${durationMinutes}分`
        : `${durationMinutes}分`;

      // ピーク視聴者数とピーク到達時間
      const peak = stream.peak || 0;
      let peakTime = "-";

      if (samples.length > 0) {
        // ピーク視聴者数の時刻を探す
        const peakSample = samples.reduce((prev: any, current: any) =>
          (current.viewer_count > prev.viewer_count) ? current : prev
        );

        if (peakSample) {
          const peakDate = new Date(peakSample.taken_at);
          peakTime = `${peakDate.getHours()}:${String(peakDate.getMinutes()).padStart(2, "0")}`;
        }
      }

      // 視聴時間概算（サンプルの平均視聴者数 × 配信時間）
      const avgViewers = samples.length > 0
        ? samples.reduce((sum: number, s: any) => sum + s.viewer_count, 0) / samples.length
        : 0;

      const estimatedWatchTimeMinutes = Math.round((avgViewers * durationMs) / (1000 * 60));
      const watchTimeHours = Math.floor(estimatedWatchTimeMinutes / 60);
      const watchTimeMinutes = estimatedWatchTimeMinutes % 60;
      const estimatedWatchTime = watchTimeHours > 0
        ? `${watchTimeHours}時間${watchTimeMinutes}分`
        : `${watchTimeMinutes}分`;

      // 開始・終了時刻をフォーマット
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      };

      return {
        id: stream.id,
        streamId: stream.stream_id,
        startedAt: formatDateTime(startedAt),
        estimatedEnd: stream.ended_at_est ? formatDateTime(endedAt) : "配信中",
        duration,
        peakViewers: peak,
        peakTime,
        estimatedWatchTime,
        platform: stream.platform || "twitch",
        thumbnailUrl: null, // TODO: Add thumbnail support after migration is fully applied
      };
    });

    return NextResponse.json({
      streams: streamsWithStats,
    });
  } catch (error: any) {
    console.error("[streams] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}