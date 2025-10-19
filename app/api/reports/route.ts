import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/db";

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/reports
 * レポートデータを取得
 *
 * Query Parameters:
 * - period: 期間（today, 7days, 30days）デフォルト: today
 * - template: テンプレートID（オプション）
 * - variant: バリアント（A or B）（オプション）
 * - search: 検索クエリ（オプション）
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

    // クエリパラメータ取得
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";
    const templateId = searchParams.get("template");
    const search = searchParams.get("search");

    // 期間の開始時刻を計算
    const now = new Date();
    let startTime: Date;

    if (period === "today") {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === "7days") {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30days") {
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }

    // Deliveriesを取得（streamとtemplateを含む）
    const { data: deliveries, error: deliveriesError } = await supabaseAdmin
      .from("deliveries")
      .select("*, streams(id, stream_id, started_at, peak)")
      .eq("user_id", user.id)
      .eq("status", "sent")
      .gte("created_at", startTime.toISOString())
      .order("created_at", { ascending: false });

    if (deliveriesError) {
      console.error("[reports] Database error:", deliveriesError);
      // データベースが未設定の場合は空のレスポンスを返す
      return NextResponse.json({
        summary: {
          totalReports: 0,
          totalClicks: 0,
          totalLift: 0,
          avgConversion: 0,
        },
        bestReport: null,
        templateStats: {},
        reports: [],
        _note: "データベースが初期化されていません。マイグレーションを実行してください。",
      });
    }

    // ユーザーのテンプレート一覧を取得
    const { data: templates } = await supabaseAdmin
      .from("templates")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // テンプレートIDから名前へのマップを作成
    const templateNameMap: Record<string, string> = {};
    (templates || []).forEach((t: any) => {
      templateNameMap[t.id] = t.name;
    });

    // N+1クエリ問題を解決：全データを一括取得
    const streamIds = (deliveries || [])
      .filter(d => d.stream_id)
      .map(d => d.stream_id);

    // 1. 全draftsを一括取得
    // SECURITY: Explicit user_id check to prevent data leakage
    const { data: allDrafts } = await supabaseAdmin
      .from("drafts")
      .select("stream_id, title")
      .eq("user_id", user.id)  // SECURITY: Explicit ownership verification
      .in("stream_id", streamIds);

    const draftByStreamId = new Map<number, any>();
    (allDrafts || []).forEach(draft => {
      draftByStreamId.set(draft.stream_id, draft);
    });

    // 2. 全linksを一括取得
    const campaignIds = streamIds.map(id => `stream-${id}`);
    const { data: allLinks } = await supabaseAdmin
      .from("links")
      .select("id, campaign_id")
      .eq("user_id", user.id)
      .in("campaign_id", campaignIds);

    const linksByCampaign = new Map<string, string[]>();
    const allLinkIds: string[] = [];
    (allLinks || []).forEach(link => {
      if (!linksByCampaign.has(link.campaign_id)) {
        linksByCampaign.set(link.campaign_id, []);
      }
      linksByCampaign.get(link.campaign_id)!.push(link.id);
      allLinkIds.push(link.id);
    });

    // 3. 全clicksを一括取得
    const { data: allClicks } = allLinkIds.length > 0
      ? await supabaseAdmin
          .from("clicks")
          .select("link_id")
          .in("link_id", allLinkIds)
      : { data: null };

    const clickCountByLink = new Map<string, number>();
    (allClicks || []).forEach(click => {
      const count = clickCountByLink.get(click.link_id) || 0;
      clickCountByLink.set(click.link_id, count + 1);
    });

    // 4. 全samplesを一括取得
    // SECURITY: Defense in depth - verify stream ownership before fetching samples
    // Even though streamIds come from user's deliveries, explicitly verify ownership
    const { data: userStreams } = streamIds.length > 0
      ? await supabaseAdmin
          .from("streams")
          .select("id")
          .eq("user_id", user.id)
          .in("id", streamIds)
      : { data: null };

    const verifiedStreamIds = (userStreams || []).map(s => s.id);

    const { data: allSamples } = verifiedStreamIds.length > 0
      ? await supabaseAdmin
          .from("samples")
          .select("stream_id, taken_at, viewer_count")
          .in("stream_id", verifiedStreamIds)  // SECURITY: Only fetch samples for verified streams
          .order("taken_at", { ascending: true })
      : { data: null };

    const samplesByStreamId = new Map<number, any[]>();
    (allSamples || []).forEach(sample => {
      if (!samplesByStreamId.has(sample.stream_id)) {
        samplesByStreamId.set(sample.stream_id, []);
      }
      samplesByStreamId.get(sample.stream_id)!.push(sample);
    });

    // 各deliveryのデータを集計（全てメモリ上で処理）
    const reportsWithStats = (deliveries || []).map((delivery: any) => {
        const stream = delivery.streams;

        if (!stream) {
          return null;
        }

        // テンプレート名を取得
        const templateName = delivery.template_id && templateNameMap[delivery.template_id]
          ? templateNameMap[delivery.template_id]
          : "テンプレート";

        // 配信タイトルを取得（draftsマップから）
        const draft = draftByStreamId.get(delivery.stream_id);
        const streamTitle = draft?.title || "配信";

        // クリック数を計算
        const campaignId = `stream-${delivery.stream_id}`;
        const linkIds = linksByCampaign.get(campaignId) || [];
        let clicks = 0;
        linkIds.forEach(linkId => {
          clicks += clickCountByLink.get(linkId) || 0;
        });

        // リフト効果を計算（samplesマップから）
        const samples = samplesByStreamId.get(delivery.stream_id) || [];
        let lift = 0;

        if (samples.length > 0) {
          const postTime = new Date(delivery.created_at);

          // 投稿前5分のサンプル
          const fiveMinBefore = new Date(postTime.getTime() - 5 * 60 * 1000);
          const beforeSamples = samples.filter(
            (s: any) => new Date(s.taken_at) >= fiveMinBefore && new Date(s.taken_at) < postTime
          );

          // 投稿後5分のサンプル
          const fiveMinAfter = new Date(postTime.getTime() + 5 * 60 * 1000);
          const afterSamples = samples.filter(
            (s: any) => new Date(s.taken_at) >= postTime && new Date(s.taken_at) <= fiveMinAfter
          );

          if (beforeSamples.length > 0 && afterSamples.length > 0) {
            const beforeAvg =
              beforeSamples.reduce((sum: number, s: any) => sum + s.viewer_count, 0) /
              beforeSamples.length;
            const afterAvg =
              afterSamples.reduce((sum: number, s: any) => sum + s.viewer_count, 0) /
              afterSamples.length;

            lift = Math.round(afterAvg - beforeAvg);
            lift = lift > 0 ? lift : 0;
          }
        }

        // クリック経由率（％）= (called_viewers / clicks) × 100
        // クリックした人のうち何%が実際に配信を見に来たか
        const conversion = clicks > 0 ? Math.round((lift / clicks) * 1000) / 10 : 0;

        // 日時をフォーマット
        const createdAt = new Date(delivery.created_at);
        const formatDateTime = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        };

        return {
          id: delivery.id,
          datetime: formatDateTime(createdAt),
          streamId: delivery.stream_id,
          streamTitle: streamTitle, // 実際の配信タイトル
          template: templateName,
          templateId: delivery.template_id || null,
          clicks,
          called_viewers: lift,
          conversion,
          status: "送信済み",
          body: `配信開始！${streamTitle}`, // 投稿内容（body_textカラムがないため生成）
        };
      });

    // nullを除外
    const reports = reportsWithStats.filter((r) => r !== null);

    // フィルター適用
    let filteredReports = reports;

    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredReports = filteredReports.filter(
        (r) =>
          r.body.toLowerCase().includes(lowerSearch) ||
          r.streamTitle.toLowerCase().includes(lowerSearch)
      );
    }

    // サマリー計算
    const totalReports = filteredReports.length;
    const totalClicks = filteredReports.reduce((sum, r) => sum + r.clicks, 0);
    const totalCalledViewers = filteredReports.reduce((sum, r) => sum + r.called_viewers, 0);
    const avgConversion = totalClicks > 0
      ? Math.round((totalCalledViewers / totalClicks) * 1000) / 10
      : 0;

    // 最も効果的だった投稿
    const bestReport = filteredReports.length > 0
      ? filteredReports.reduce((best, r) => (r.called_viewers > best.called_viewers ? r : best))
      : null;

    // テンプレート別集計
    const templateStats = filteredReports.reduce(
      (acc, r) => {
        const key = r.templateId || 'default'; // templateIdがなければdefaultで代用
        if (!acc[key]) {
          acc[key] = {
            name: r.template || 'デフォルトテンプレート',
            count: 0,
            totalCalledViewers: 0,
            totalClicks: 0,
            totalConversion: 0,
            bestRecord: { calledViewers: 0, date: "" }
          };
        }
        acc[key].count++;
        acc[key].totalCalledViewers += r.called_viewers;
        acc[key].totalClicks += r.clicks;
        acc[key].totalConversion += r.conversion;

        // 最高記録を更新
        if (r.called_viewers > acc[key].bestRecord.calledViewers) {
          acc[key].bestRecord = {
            calledViewers: r.called_viewers,
            date: r.datetime
          };
        }

        return acc;
      },
      {} as Record<string, {
        name: string;
        count: number;
        totalCalledViewers: number;
        totalClicks: number;
        totalConversion: number;
        bestRecord: { calledViewers: number; date: string };
      }>
    );

    // テンプレート統計を整形（平均値を計算）
    const templateComparison = Object.entries(templateStats).map(([id, stats]) => ({
      id,
      name: stats.name,
      count: stats.count,
      avgCalledViewers: stats.count > 0 ? Math.round(stats.totalCalledViewers / stats.count) : 0,
      avgClicks: stats.count > 0 ? Math.round(stats.totalClicks / stats.count) : 0,
      avgConversion: stats.totalClicks > 0 ? Math.round((stats.totalCalledViewers / stats.totalClicks) * 1000) / 10 : 0,
      bestRecord: stats.bestRecord
    }));


    return NextResponse.json({
      summary: {
        totalReports,
        totalClicks,
        totalCalledViewers,
        avgConversion,
      },
      bestReport,
      templateStats,
      templateComparison,
      reports: filteredReports,
    });
  } catch (error: any) {
    console.error("[reports] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
