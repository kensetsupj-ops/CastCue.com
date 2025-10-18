import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/db";

/**
 * GET /api/dashboard
 * ダッシュボード用の集計データを取得
 *
 * Query Parameters:
 * - range: 期間（1d=今日, 7d=7日間, 30d=30日間）デフォルト: 1d
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

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 1. 配信履歴とdeliveries取得（全期間）
    const { data: deliveries } = await supabaseAdmin
      .from("deliveries")
      .select("id, user_id, stream_id, status, template_id, body_text, created_at, streams(*)")
      .eq("user_id", user.id)
      .eq("status", "sent")
      .order("created_at", { ascending: false });

    // 2. 前回の配信を取得（終了した配信のみ）
    const { data: previousStreams } = await supabaseAdmin
      .from("streams")
      .select("*, samples(*)")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)  // 終了した配信のみ
      .order("started_at", { ascending: false })
      .limit(1);

    // 3. 期間内のクリック数集計（N+1クエリ問題を解決）
    let totalClicks = 0;
    let clicksByDelivery: Record<string, number> = {};

    if (deliveries && deliveries.length > 0) {
      // 全stream_idのcampaign_idリストを作成
      const campaignIds = deliveries
        .filter(d => d.stream_id)
        .map(d => `stream-${d.stream_id}`);

      if (campaignIds.length > 0) {
        // 全linksを一括取得（IN句で1回のクエリ）
        const { data: allLinks } = await supabaseAdmin
          .from("links")
          .select("id, campaign_id")
          .eq("user_id", user.id)
          .in("campaign_id", campaignIds);

        if (allLinks && allLinks.length > 0) {
          // campaign_id -> link_ids のマップを作成
          const linksByCampaign = new Map<string, string[]>();
          const allLinkIds = allLinks.map(link => {
            const campaignId = link.campaign_id;
            if (!linksByCampaign.has(campaignId)) {
              linksByCampaign.set(campaignId, []);
            }
            linksByCampaign.get(campaignId)!.push(link.id);
            return link.id;
          });

          // 全clicksを一括取得（IN句で1回のクエリ）
          const { data: allClicks } = await supabaseAdmin
            .from("clicks")
            .select("link_id")
            .in("link_id", allLinkIds);

          // link_id -> click count のマップを作成
          const clickCountByLink = new Map<string, number>();
          if (allClicks) {
            allClicks.forEach(click => {
              const count = clickCountByLink.get(click.link_id) || 0;
              clickCountByLink.set(click.link_id, count + 1);
            });
          }

          // 各deliveryのクリック数を計算
          for (const delivery of deliveries) {
            if (!delivery.stream_id) continue;

            const campaignId = `stream-${delivery.stream_id}`;
            const linkIds = linksByCampaign.get(campaignId) || [];

            let deliveryClickCount = 0;
            linkIds.forEach(linkId => {
              deliveryClickCount += clickCountByLink.get(linkId) || 0;
            });

            clicksByDelivery[delivery.id] = deliveryClickCount;
            totalClicks += deliveryClickCount;
          }
        }
      }
    }

    // 4. リフト計算（サンプリングデータから）
    let totalLift = 0;
    const liftByStream: Record<number, number> = {};

    for (const stream of previousStreams || []) {
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

    // 5. テンプレート一覧を取得
    const { data: templates } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // テンプレートIDから名前を取得するマップ
    const templateMap: Record<string, string> = {};
    templates?.forEach(t => {
      templateMap[t.id] = t.name;
    });

    // 6. 最も効果的だった投稿とテンプレート
    let bestDelivery = null;
    let maxLift = 0;
    let bestTemplateName = "デフォルトテンプレート";

    for (const delivery of deliveries || []) {
      const lift = delivery.stream_id ? liftByStream[delivery.stream_id] || 0 : 0;
      if (lift > maxLift) {
        maxLift = lift;
        bestDelivery = delivery;
        // deliveryからtemplate_idを取得してテンプレート名を特定
        if (delivery.template_id && templateMap[delivery.template_id]) {
          bestTemplateName = templateMap[delivery.template_id];
        }
      }
    }

    // 7. タイムラインデータ生成（前回の配信）
    const latestStream = previousStreams?.[0];
    let timeline: any[] = [];
    let announcementTime: string | null = null;

    if (latestStream && latestStream.samples) {
      const samples = latestStream.samples.sort(
        (a: any, b: any) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
      );

      // 投稿時刻を取得
      const delivery = deliveries?.find((d) => d.stream_id === latestStream.id);
      if (delivery && delivery.created_at) {
        const postTime = new Date(delivery.created_at);
        announcementTime = `${postTime.getHours()}:${String(postTime.getMinutes()).padStart(2, "0")}`;
      }

      // Get links for this stream to calculate clicks over time
      const { data: streamLinks } = await supabaseAdmin
        .from("links")
        .select("id")
        .eq("user_id", user.id)
        .eq("campaign_id", `stream-${latestStream.id}`);

      // Get all clicks with timestamps for this stream
      const clickTimestamps: Date[] = [];
      if (streamLinks && streamLinks.length > 0) {
        for (const link of streamLinks) {
          const { data: clicks } = await supabaseAdmin
            .from("clicks")
            .select("clicked_at")
            .eq("link_id", link.id);

          if (clicks) {
            clickTimestamps.push(...clicks.map(c => new Date(c.clicked_at)));
          }
        }
      }

      for (const sample of samples) {
        const sampleTime = new Date(sample.taken_at);
        const timeStr = `${sampleTime.getHours()}:${String(sampleTime.getMinutes()).padStart(2, "0")}`;

        // Count clicks up to this sample time
        const clicksUpToNow = clickTimestamps.filter(ct => ct <= sampleTime).length;

        // Mark if this is the announcement point
        const isAnnouncement = announcementTime === timeStr;

        timeline.push({
          time: timeStr,
          viewers: sample.viewer_count,
          clicks: clicksUpToNow,
          announcement: isAnnouncement,
        });
      }
    }


    // 8. 最近の投稿
    let recentPosts =
      deliveries?.slice(0, 10).map((delivery) => {
        const createdAt = new Date(delivery.created_at);
        const now = new Date();

        // 相対時間表示の計算
        const diffMs = now.getTime() - createdAt.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let timeStr: string;
        if (diffDays === 0) {
          // 今日
          timeStr = `${createdAt.getHours()}:${String(createdAt.getMinutes()).padStart(2, "0")}`;
        } else if (diffDays === 1) {
          timeStr = "昨日";
        } else {
          timeStr = `${diffDays}日前`;
        }

        const lift = delivery.stream_id ? liftByStream[delivery.stream_id] || 0 : 0;
        const clicks = clicksByDelivery[delivery.id] || 0;

        // 投稿本文を取得（最初の30文字まで表示）
        let snippet = "配信開始告知";
        if (delivery.body_text) {
          // 改行を削除して最初の30文字を取得
          const cleanText = delivery.body_text.replace(/\n/g, ' ').trim();
          snippet = cleanText.length > 30 ? cleanText.slice(0, 30) + '...' : cleanText;
        }

        return {
          time: timeStr,
          snippet,
          clicks,
          called_viewers: lift,
          status: delivery.status,
          stream_id: delivery.stream_id, // 配信IDを追加
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
      no_templates: !templates || templates.length === 0, // テンプレート未作成
    };

    // 10. おすすめテンプレート（最新のテンプレートを推奨）
    const recommendedTemplate = templates && templates.length > 0 ? templates[0].name : "デフォルトテンプレート";
    const recommendation = {
      time: "19:05",
      template: recommendedTemplate,
      reason: "伸びやすい見込み",
    };

    // KPIデータ（累計）
    const totalPosts = deliveries?.length || 0;
    const kpiData = {
      today_called_viewers: totalLift, // 累計で呼べた人数
      today_clicks_sum: totalClicks, // 累計クリック数
      per_post_click_avg:
        totalPosts > 0
          ? Math.round((totalClicks / totalPosts) * 10) / 10
          : 0,
      per_post_called_avg:
        totalPosts > 0
          ? Math.round((totalLift / totalPosts) * 10) / 10
          : 0, // 1投稿あたりの平均呼べた人数
      conversion_rate:
        totalClicks > 0
          ? Math.round((totalLift / totalClicks) * 1000) / 10
          : 0, // CVR: 呼べた人数/クリック数 (%)
      total_posts: totalPosts, // 総投稿数
    };

    // 最も効果的だったテンプレート
    const winnersData = {
      best_template: bestDelivery
        ? {
            name: bestTemplateName,
            snippet: "配信開始告知",
            called_viewers: maxLift,
            clicks: clicksByDelivery[bestDelivery.id] || 0,
          }
        : null,
    };

    // テンプレート別の統計（実データがある場合のみ生成）
    const templateStats = templates && templates.length > 0 ? templates.map(template => {
      // このテンプレートを使った配信を集計
      const templateDeliveries = deliveries?.filter(d => d.template_id === template.id) || [];

      if (templateDeliveries.length === 0) return null;

      const totalLiftForTemplate = templateDeliveries.reduce((sum, d) => {
        const lift = d.stream_id ? liftByStream[d.stream_id] || 0 : 0;
        return sum + lift;
      }, 0);

      const totalClicksForTemplate = templateDeliveries.reduce((sum, d) => {
        return sum + (clicksByDelivery[d.id] || 0);
      }, 0);

      return {
        name: template.name,
        uses: templateDeliveries.length,
        avgCalledViewers: templateDeliveries.length > 0 ? Math.round(totalLiftForTemplate / templateDeliveries.length) : 0,
        avgClicks: templateDeliveries.length > 0 ? Math.round(totalClicksForTemplate / templateDeliveries.length) : 0,
      };
    }).filter(stat => stat !== null) : [];

    // レスポンス
    return NextResponse.json({
      recommendation,
      kpi: kpiData,
      winners: winnersData,
      templateStats, // テンプレート別統計
      timeline,
      recentPosts,
      banners,
    });
  } catch (error: any) {
    console.error("[dashboard] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
