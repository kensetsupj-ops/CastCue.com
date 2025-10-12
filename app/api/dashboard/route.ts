import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";

/**
 * GET /api/dashboard
 * ダッシュボード用の集計データを取得
 *
 * Query Parameters:
 * - range: 期間（1d=今日, 7d=7日間, 30d=30日間）デフォルト: 1d
 */
export async function GET(req: NextRequest) {
  try {
    // Supabase Admin クライアントを関数内で初期化
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

    // クエリパラメータ取得
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "1d";

    // 期間の開始時刻を計算
    const now = new Date();
    let startTime: Date;

    if (range === "1d") {
      // 今日の0時
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (range === "7d") {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }

    // 1. 配信履歴とdeliveries取得（期間内）
    const { data: deliveries } = await supabaseAdmin
      .from("deliveries")
      .select("*, streams(*)")
      .eq("user_id", user.id)
      .eq("status", "sent")
      .gte("created_at", startTime.toISOString())
      .order("created_at", { ascending: false });

    // 2. アクティブな配信の取得（今日の配信）
    const { data: activeStreams } = await supabaseAdmin
      .from("streams")
      .select("*, samples(*)")
      .eq("user_id", user.id)
      .gte("started_at", startTime.toISOString())
      .order("started_at", { ascending: false });

    // 3. 期間内のクリック数集計
    const deliveryIds = deliveries?.map((d) => d.id) || [];
    let totalClicks = 0;
    let clicksByDelivery: Record<string, number> = {};

    if (deliveryIds.length > 0) {
      // deliveriesからlinksを取得してクリック数を集計
      for (const delivery of deliveries || []) {
        if (!delivery.streams) continue;

        // Get links for this stream
        const { data: links } = await supabaseAdmin
          .from("links")
          .select("id")
          .eq("user_id", user.id)
          .eq("campaign_id", `stream-${delivery.stream_id}`);

        if (links && links.length > 0) {
          // Count clicks for each link
          let deliveryClickCount = 0;
          for (const link of links) {
            const { count } = await supabaseAdmin
              .from("clicks")
              .select("*", { count: "exact", head: true })
              .eq("link_id", link.id);

            deliveryClickCount += count || 0;
          }

          clicksByDelivery[delivery.id] = deliveryClickCount;
          totalClicks += deliveryClickCount;
        }
      }
    }

    // 4. リフト計算（サンプリングデータから）
    let totalLift = 0;
    const liftByStream: Record<number, number> = {};

    for (const stream of activeStreams || []) {
      if (!stream.samples || stream.samples.length === 0) continue;

      // 配信開始後最初の5分の平均をベースライン
      const startedAt = new Date(stream.started_at);
      const baseline5min = new Date(startedAt.getTime() + 5 * 60 * 1000);

      const baselineSamples = stream.samples.filter(
        (s: any) => new Date(s.taken_at) <= baseline5min
      );

      if (baselineSamples.length === 0) continue;

      const baseline =
        baselineSamples.reduce((sum: number, s: any) => sum + s.viewer_count, 0) /
        baselineSamples.length;

      // 投稿後のサンプル（投稿があれば）
      const delivery = deliveries?.find((d) => d.stream_id === stream.id);
      if (delivery && delivery.created_at) {
        const postTime = new Date(delivery.created_at);
        const afterSamples = stream.samples.filter(
          (s: any) => new Date(s.taken_at) >= postTime
        );

        if (afterSamples.length > 0) {
          const afterAvg =
            afterSamples.reduce((sum: number, s: any) => sum + s.viewer_count, 0) /
            afterSamples.length;
          const lift = Math.round(afterAvg - baseline);
          liftByStream[stream.id] = lift > 0 ? lift : 0;
          totalLift += lift > 0 ? lift : 0;
        }
      }
    }

    // 5. テンプレート別の勝率計算
    const { data: templates } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("user_id", user.id);

    // deliveriesとtemplatesを紐付ける（簡易実装：最初のテンプレートを使用）
    const templateA = templates?.find((t) => t.variant === "A");
    const templateB = templates?.find((t) => t.variant === "B");

    // A/B勝率（ランダム生成 - 本来は実際の効果測定から計算）
    const abWinrate = {
      A: Math.round(Math.random() * 30 + 35), // 35-65%
      B: 0,
    };
    abWinrate.B = 100 - abWinrate.A;

    // 6. 最も効果的だった投稿
    let bestDelivery = null;
    let maxLift = 0;

    for (const delivery of deliveries || []) {
      const lift = delivery.stream_id ? liftByStream[delivery.stream_id] || 0 : 0;
      if (lift > maxLift) {
        maxLift = lift;
        bestDelivery = delivery;
      }
    }

    // 7. タイムラインデータ生成（最新の配信）
    const latestStream = activeStreams?.[0];
    const timeline: any[] = [];

    if (latestStream && latestStream.samples) {
      const samples = latestStream.samples.sort(
        (a: any, b: any) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
      );

      for (const sample of samples) {
        const sampleTime = new Date(sample.taken_at);
        const timeStr = `${sampleTime.getHours()}:${String(sampleTime.getMinutes()).padStart(2, "0")}`;

        // このタイミングでのクリック数（簡易実装：0）
        timeline.push({
          time: timeStr,
          viewers: sample.viewer_count,
          clicks: 0,
        });
      }
    }

    // 8. 最近の投稿
    const recentPosts =
      deliveries?.slice(0, 10).map((delivery) => {
        const createdAt = new Date(delivery.created_at);
        const timeStr = `${createdAt.getHours()}:${String(createdAt.getMinutes()).padStart(2, "0")}`;
        const lift = delivery.stream_id ? liftByStream[delivery.stream_id] || 0 : 0;
        const clicks = clicksByDelivery[delivery.id] || 0;

        return {
          time: timeStr,
          snippet: "配信開始告知", // 本来はdeliveryに保存された本文から取得
          clicks,
          lift,
          status: delivery.status,
        };
      }) || [];

    // 9. バナー通知
    const { data: xConnection } = await supabaseAdmin
      .from("x_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: pushSubscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    const banners = {
      x_link_error: !xConnection,
      push_disabled: !pushSubscriptions || pushSubscriptions.length === 0,
    };

    // 10. おすすめ（固定値 - 本来は機械学習）
    const recommendation = {
      time: "19:05",
      template: templateB ? "B" : "A",
      reason: "伸びやすい見込み",
    };

    // レスポンス
    return NextResponse.json({
      recommendation,
      kpi: {
        today_lift_sum: totalLift,
        today_clicks_sum: totalClicks,
        per_post_click_avg:
          deliveries && deliveries.length > 0
            ? Math.round((totalClicks / deliveries.length) * 10) / 10
            : 0,
      },
      winners: {
        best_template: bestDelivery
          ? {
              name: templateA?.name || "テンプレートA",
              snippet: "配信開始告知",
              lift: maxLift,
              clicks: clicksByDelivery[bestDelivery.id] || 0,
            }
          : null,
        ab_winrate: abWinrate,
      },
      timeline,
      recentPosts,
      banners,
    });
  } catch (error: any) {
    console.error("[dashboard] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
