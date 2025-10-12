import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";

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
    const period = searchParams.get("period") || "today";
    const templateId = searchParams.get("template");
    const variant = searchParams.get("variant");
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

    // 各deliveryのデータを集計
    const reportsWithStats = await Promise.all(
      (deliveries || []).map(async (delivery: any) => {
        const stream = delivery.streams;

        if (!stream) {
          return null;
        }

        // クリック数を取得
        const { data: links } = await supabaseAdmin
          .from("links")
          .select("id")
          .eq("user_id", user.id)
          .eq("campaign_id", `stream-${delivery.stream_id}`);

        let clicks = 0;
        if (links && links.length > 0) {
          for (const link of links) {
            const { count } = await supabaseAdmin
              .from("clicks")
              .select("*", { count: "exact", head: true })
              .eq("link_id", link.id);

            clicks += count || 0;
          }
        }

        // リフト効果を計算（samplesから）
        const { data: samples } = await supabaseAdmin
          .from("samples")
          .select("*")
          .eq("stream_id", delivery.stream_id)
          .order("taken_at", { ascending: true });

        let lift = 0;

        if (samples && samples.length > 0) {
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

        // 視聴率（conversion rate）= lift / clicks
        const conversion = clicks > 0 ? lift / clicks : 0;

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
          streamTitle: "配信", // TODO: Get actual stream title from drafts table
          template: "テンプレート", // TODO: Get template name
          variant: "A", // TODO: Get variant from template
          clicks,
          lift,
          conversion,
          status: "送信済み",
          body: "投稿内容", // TODO: Store post body in deliveries table
        };
      })
    );

    // nullを除外
    const reports = reportsWithStats.filter((r) => r !== null);

    // フィルター適用
    let filteredReports = reports;

    if (variant) {
      filteredReports = filteredReports.filter((r) => r.variant === variant);
    }

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
    const totalLift = filteredReports.reduce((sum, r) => sum + r.lift, 0);
    const avgConversion = filteredReports.length > 0
      ? filteredReports.reduce((sum, r) => sum + r.conversion, 0) / filteredReports.length
      : 0;

    // 最も効果的だった投稿
    const bestReport = filteredReports.length > 0
      ? filteredReports.reduce((best, r) => (r.lift > best.lift ? r : best))
      : null;

    // テンプレート別集計
    const templateStats = filteredReports.reduce(
      (acc, r) => {
        const key = r.variant;
        if (!acc[key]) {
          acc[key] = { count: 0, totalLift: 0, totalClicks: 0 };
        }
        acc[key].count++;
        acc[key].totalLift += r.lift;
        acc[key].totalClicks += r.clicks;
        return acc;
      },
      {} as Record<string, { count: number; totalLift: number; totalClicks: number }>
    );

    return NextResponse.json({
      summary: {
        totalReports,
        totalClicks,
        totalLift,
        avgConversion,
      },
      bestReport,
      templateStats,
      reports: filteredReports,
    });
  } catch (error: any) {
    console.error("[reports] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
