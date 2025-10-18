import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { TwitchClient } from "@/lib/twitch";

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const twitchClient = new TwitchClient();

/**
 * GET /api/streams/[id]
 * 配信詳細データ取得
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params;

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

    // 実際の配信データ取得
    const { data: stream, error: streamError } = await supabaseAdmin
      .from("streams")
      .select(`
        *,
        twitch_accounts!inner(
          broadcaster_user_id,
          broadcaster_type,
          profile_image_url,
          view_count
        )
      `)
      .eq("id", streamId)
      .eq("user_id", user.id)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    // Twitchユーザー情報を取得（総視聴回数など）
    const broadcasterUserId = stream.twitch_accounts?.broadcaster_user_id;
    let twitchUserData = null;
    let channelData = null;
    let clipsData = null;

    if (broadcasterUserId) {
      // 並列でTwitch APIを呼び出し（エラーがあっても継続）
      const [userResult, channelResult, clipsResult] = await Promise.allSettled([
        twitchClient.getUser(broadcasterUserId),
        twitchClient.getChannel(broadcasterUserId),
        twitchClient.getClips(
          broadcasterUserId,
          stream.started_at,
          stream.ended_at || undefined
        )
      ]);

      // 成功したAPIの結果を取得
      if (userResult.status === "fulfilled") {
        twitchUserData = userResult.value;
      } else {
        console.error("Failed to fetch user data:", userResult.reason);
      }

      if (channelResult.status === "fulfilled") {
        channelData = channelResult.value;
      } else {
        console.error("Failed to fetch channel data:", channelResult.reason);
      }

      if (clipsResult.status === "fulfilled") {
        clipsData = clipsResult.value;
      } else {
        console.error("Failed to fetch clips data:", clipsResult.reason);
      }
    }

    // サンプリングデータ取得
    const { data: samples, error: samplesError } = await supabaseAdmin
      .from("stream_samples")
      .select("*")
      .eq("stream_id", streamId)
      .order("sampled_at", { ascending: true });

    // 配信に関連する投稿データ取得（テンプレート情報も含む）
    const { data: deliveries, error: deliveriesError } = await supabaseAdmin
      .from("deliveries")
      .select(`
        *,
        templates(id, name)
      `)
      .eq("stream_id", streamId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // stream_analyticsデータ取得（テーブルが存在しない場合も考慮）
    let analytics = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("stream_analytics")
        .select("*")
        .eq("stream_id", streamId)
        .single();

      if (!error) {
        analytics = data;
      }
    } catch (error) {
      console.warn("stream_analytics table might not exist:", error);
    }

    // stream_eventsデータ取得（タイムライン用）
    let events = [];
    try {
      const { data, error } = await supabaseAdmin
        .from("stream_events")
        .select("*")
        .eq("stream_id", streamId)
        .order("occurred_at", { ascending: true });

      if (!error && data) {
        events = data;
      }
    } catch (error) {
      console.warn("stream_events table might not exist:", error);
    }

    // データ整形
    const chartData = samples?.map(sample => ({
      time: new Date(sample.sampled_at).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      viewers: sample.viewer_count,
      clicks: 0 // クリック数は未実装（将来的にclicksテーブルから集計予定）
    })) || [];

    // イベント生成（stream_eventsとdeliveriesから）
    const timelineEvents = [];

    // 配信開始イベント
    timelineEvents.push({
      time: new Date(stream.started_at).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      type: "start",
      title: "配信開始",
      description: stream.title || "配信を開始しました",
      impact: 0
    });

    // 投稿イベント
    if (deliveries && deliveries.length > 0) {
      deliveries.forEach(delivery => {
        timelineEvents.push({
          time: new Date(delivery.created_at).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          type: "post",
          title: "X投稿完了",
          description: `配信開始を${delivery.platform}に投稿`,
          impact: delivery.lift || 0
        });
      });
    }

    // stream_eventsは将来の拡張用に保持（現在は使用しない）
    // レイド、フォロー、サブスク等のイベントはTwitch EventSubの追加実装が必要

    // 統計データ計算（analyticsデータとサンプルから）
    const viewerCounts = samples?.map(s => s.viewer_count) || [];

    // 平均視聴者数の計算
    const averageViewers = analytics?.average_viewers ||
      (viewerCounts.length > 0 ? Math.round(viewerCounts.reduce((a, b) => a + b, 0) / viewerCounts.length) : 0);

    const stats = {
      averageViewers: averageViewers,
      peakViewers: analytics?.peak_viewers ||
        (viewerCounts.length > 0 ? Math.max(...viewerCounts) : 0),
      peakTime: analytics?.peak_viewers_at
        ? new Date(analytics.peak_viewers_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
        : (samples && samples.length > 0
          ? new Date(samples.find(s => s.viewer_count === Math.max(...viewerCounts))?.sampled_at || "")
              .toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
          : ""),
      // totalViewsは削除（チャンネル全体の累計であり、配信詳細としては不適切）
      newFollowers: analytics?.new_followers || 0,
      clips: clipsData?.clips?.length || 0,
      engagement: calculateEngagement(analytics, averageViewers),
      // 追加の実データ
      newSubscribers: analytics?.new_subscribers || 0,
      totalRaids: analytics?.total_raids || 0,
      totalRaidViewers: analytics?.total_raid_viewers || 0,
      bitsCheered: analytics?.bits_cheered || 0,
      gameId: stream.game_id || channelData?.game_id,
      gameName: stream.game_name || channelData?.game_name || "カテゴリなし",
      language: stream.language || "ja"
    };

    // ソーシャルメトリクス（配信データから生成）
    const socialMetrics = [];
    if (deliveries && deliveries.length > 0) {
      const xDeliveries = deliveries.filter(d => d.platform === "X" || d.platform === "Twitter");
      if (xDeliveries.length > 0) {
        socialMetrics.push({
          platform: "X",
          posts: xDeliveries.length,
          impressions: xDeliveries.reduce((sum, d) => sum + (d.impressions || 0), 0),
          engagements: xDeliveries.reduce((sum, d) => sum + (d.engagements || 0), 0),
          clicks: xDeliveries.reduce((sum, d) => sum + (d.clicks || 0), 0),
          conversionRate: calculateConversionRate(xDeliveries)
        });
      }
    }

    // 投稿情報の整形
    const postInfo = deliveries && deliveries.length > 0 ? deliveries.map(delivery => ({
      id: delivery.id,
      createdAt: new Date(delivery.created_at).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }),
      templateName: delivery.templates?.name || "テンプレート未使用",
      bodyText: delivery.body_text || "",
      status: delivery.status,
      channel: delivery.channel
    })) : null;

    return NextResponse.json({
      stream: {
        id: stream.id,
        streamId: stream.stream_id,
        title: stream.title,
        startedAt: new Date(stream.started_at).toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }),
        duration: calculateDuration(stream.started_at, stream.ended_at),
        isLive: !stream.ended_at,
        thumbnailUrl: stream.thumbnail_url,
        gameName: stream.game_name || channelData?.game_name,
        language: stream.language,
        viewerCount: stream.viewer_count
      },
      chartData,
      events: timelineEvents,
      stats,
      socialMetrics,
      postInfo, // 投稿情報を追加
      // 追加のTwitch情報
      twitchData: {
        totalChannelViews: twitchUserData?.view_count,
        broadcasterType: stream.twitch_accounts?.broadcaster_type,
        profileImageUrl: stream.twitch_accounts?.profile_image_url,
        clips: clipsData?.clips?.map(clip => ({
          id: clip.id,
          title: clip.title,
          url: clip.url,
          viewCount: clip.view_count,
          createdAt: clip.created_at
        }))
      }
    });

  } catch (error: any) {
    console.error("[streams/:id] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ヘルパー関数
function calculateDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function calculateEngagement(analytics: any, averageViewers: number): number {
  // データがない場合は0を返す（推定値を使用しない）
  if (!analytics || averageViewers === 0) return 0;

  // エンゲージメント率を計算（実データのみから計算）
  // 各インタラクションの重み付け：
  // - 新規フォロワー: 1人あたり10ポイント
  // - サブスクライバー: 1人あたり20ポイント
  // - レイド: 1回あたり15ポイント
  // - ビッツ: 100ビッツあたり1ポイント
  const interactions =
    (analytics.new_followers || 0) * 10 +
    (analytics.new_subscribers || 0) * 20 +
    (analytics.total_raids || 0) * 15 +
    (analytics.bits_cheered || 0) / 100;

  // 平均視聴者数に対するインタラクション率を計算
  const engagementRate = Math.min(100, Math.round((interactions / averageViewers) * 10));
  return engagementRate; // 0%〜100%の範囲
}

// 削除: calculateAverageWatchTime関数（推定値のため使用しない）

function calculateConversionRate(deliveries: any[]): number {
  const totalClicks = deliveries.reduce((sum, d) => sum + (d.clicks || 0), 0);
  const totalImpressions = deliveries.reduce((sum, d) => sum + (d.impressions || 0), 0);
  if (totalImpressions === 0) return 0;
  return Math.round((totalClicks / totalImpressions) * 100 * 10) / 10;
}