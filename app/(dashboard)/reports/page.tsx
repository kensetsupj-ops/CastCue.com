"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Calendar, Download, Search, TrendingUp, Users, MousePointerClick, Trophy, Sparkles, ArrowUp, ArrowDown, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  datetime: string;
  streamId: number;
  streamTitle: string;
  template: string;
  variant: string;
  clicks: number;
  lift: number;
  conversion: number;
  status: string;
  body: string;
}

interface ReportsData {
  summary: {
    totalReports: number;
    totalClicks: number;
    totalLift: number;
    avgConversion: number;
  };
  bestReport: Report | null;
  templateStats: Record<string, { count: number; totalLift: number; totalClicks: number }>;
  reports: Report[];
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [variant, setVariant] = useState("");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        setError(null);

        // 認証チェック
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        // レポートデータを取得
        const params = new URLSearchParams({
          period,
          ...(variant && { variant }),
          ...(searchQuery && { search: searchQuery }),
        });

        const response = await fetch(`/api/reports?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }

        const reportsData = await response.json();
        setData(reportsData);
      } catch (err: any) {
        console.error("Error fetching reports:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [period, variant, searchQuery, supabase, router]);

  // Mock data for fallback
  const reports = data?.reports || [
    {
      id: "1",
      datetime: "2025-10-09 14:30",
      streamTitle: "APEX ランクマ配信 ダイヤ到達目指す！",
      template: "テンプレートB",
      variant: "B",
      clicks: 24,
      lift: 15,
      conversion: 0.625,
      status: "送信済み",
      body: "配信開始！今日も楽しくやっていきます！ APEX ランクマ配信 ダイヤ到達目指す！ https://twitch.tv/yourname",
    },
    {
      id: "2",
      datetime: "2025-10-09 12:15",
      streamTitle: "雑談配信 ゲームの話しよう",
      template: "テンプレートA",
      variant: "A",
      clicks: 18,
      lift: 12,
      conversion: 0.667,
      status: "送信済み",
      body: "ライブ配信中🎮 雑談配信 ゲームの話しよう やってるよ〜 https://twitch.tv/yourname",
    },
    {
      id: "3",
      datetime: "2025-10-09 10:00",
      streamTitle: "朝活！マイクラ建築配信",
      template: "テンプレートB",
      variant: "B",
      clicks: 31,
      lift: 20,
      conversion: 0.645,
      status: "送信済み",
      body: "配信開始！今日も楽しくやっていきます！ 朝活！マイクラ建築配信 https://twitch.tv/yourname",
    },
  ];

  // サマリー計算
  const totalClicks = data?.summary.totalClicks || 0;
  const totalLift = data?.summary.totalLift || 0;
  const avgConversion = data?.summary.avgConversion || 0;
  const bestReport = data?.bestReport || (reports.length > 0 ? reports[0] : null);

  // テンプレート別集計
  const templateStats = data?.templateStats || {};

  const handleExport = () => {
    // CSV export logic
    console.log("Exporting to CSV...");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-neutral-sub">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-danger mx-auto mb-4" />
            <p className="text-body text-neutral-ink mb-4">データの読み込みに失敗しました</p>
            <p className="text-small text-neutral-sub mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>再読み込み</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-ink">レポート</h1>
          <p className="text-neutral-sub">告知単位の深掘り・比較・出力</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          CSVエクスポート
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-neutral-border hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-sub mb-2">合計告知数</p>
                <p className="text-4xl font-bold text-neutral-ink">{reports.length}</p>
                <p className="text-xs text-neutral-sub mt-2">回投稿</p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-primary" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-border hover:border-success/50 hover:shadow-xl hover:shadow-success/10 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-sub mb-2">合計クリック数</p>
                <p className="text-4xl font-bold text-neutral-ink">{totalClicks}</p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                  平均 {(totalClicks / reports.length).toFixed(1)}回/投稿
                </p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-success/10 to-success/5 flex items-center justify-center">
                <MousePointerClick className="h-7 w-7 text-success" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-border hover:border-success/50 hover:shadow-xl hover:shadow-success/10 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-sub mb-2">獲得視聴者数</p>
                <p className="text-4xl font-bold text-neutral-ink">+{totalLift}</p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                  平均 +{(totalLift / reports.length).toFixed(1)}人/投稿
                </p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-success/10 to-success/5 flex items-center justify-center">
                <Users className="h-7 w-7 text-success" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-border hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-sub mb-2">クリック→視聴率</p>
                <p className="text-4xl font-bold text-neutral-ink">{(avgConversion * 100).toFixed(1)}%</p>
                <p className="text-xs text-neutral-sub mt-2">告知の質を示す指標</p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-primary" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* インサイト */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.75} />
            </div>
            インサイトとおすすめ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* ベストパフォーマンス */}
            {bestReport ? (
              <div className="flex items-start gap-3 p-4 bg-white border border-success/20 hover:border-success/40 transition-all duration-300">
                <div className="h-10 w-10 bg-gradient-to-br from-success/10 to-success/5 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-6 w-6 text-success" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-ink">最も効果的だった告知</p>
                  <p className="text-xs text-neutral-sub mt-1">
                    {bestReport.datetime} の投稿が <span className="font-bold text-success">+{bestReport.lift}人</span> の視聴者を獲得
                  </p>
                  <p className="text-xs text-neutral-ink mt-2 bg-neutral-bg p-2">
                    「{bestReport.body}」
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-white border border-neutral-border">
                <div className="h-10 w-10 bg-neutral-bg flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-6 w-6 text-neutral-sub" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-ink">最も効果的だった告知</p>
                  <p className="text-xs text-neutral-sub mt-1">
                    まだ配信データがありません。配信を行うとここに統計情報が表示されます。
                  </p>
                </div>
              </div>
            )}

            {/* テンプレート比較 */}
            <div className="flex items-start gap-3 p-4 bg-white border border-neutral-border hover:border-primary/40 transition-all duration-300">
              <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-ink">テンプレート別パフォーマンス</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(templateStats).map(([variant, stats]) => (
                    <div key={variant} className="flex items-center gap-2">
                      <span className="inline-flex items-center bg-primary/10 px-2 py-1 text-xs font-medium text-primary min-w-[32px] justify-center">
                        {variant}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-border h-2">
                            <div
                              className="bg-primary h-2"
                              style={{ width: `${(stats.totalLift / totalLift) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-neutral-ink min-w-[80px] text-right">
                            平均 +{(stats.totalLift / stats.count).toFixed(1)}人
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* おすすめアクション */}
            {bestReport && (
              <div className="flex items-start gap-3 p-4 bg-white border border-primary/20 hover:border-primary/40 transition-all duration-300">
                <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-ink">次回のおすすめ</p>
                  <p className="text-xs text-neutral-sub mt-1">
                    {bestReport.variant === 'A' ? 'テンプレートA' : 'テンプレートB'} の勝率が高いです。次回も同じテンプレートを使うと効果的かもしれません。
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-sub" strokeWidth={1.75} />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="today">今日</option>
                <option value="7days">7日間</option>
                <option value="30days">30日間</option>
                <option value="custom">カスタム</option>
              </select>
            </div>

            {/* Template Filter */}
            <select className="px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">すべてのテンプレート</option>
              <option value="a">テンプレートA</option>
              <option value="b">テンプレートB</option>
            </select>

            {/* Variant Filter */}
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">すべてのバリアント</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-sub" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="本文を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink placeholder:text-neutral-sub focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>告知一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-neutral-border bg-neutral-bg/50">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-neutral-ink">配信タイトル</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-neutral-ink">投稿文</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-neutral-ink">クリック</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-neutral-ink">獲得視聴者</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-neutral-ink">視聴率</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-neutral-ink">アクション</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  // 相対的な良し悪しを計算
                  const isTopPerformer = bestReport && report.lift >= bestReport.lift * 0.8;
                  const liftColor = report.lift > 15 ? "text-success" : report.lift > 10 ? "text-primary" : "text-neutral-ink";

                  return (
                    <tr
                      key={report.id}
                      className={cn(
                        "border-b border-neutral-border hover:bg-neutral-bg/30 transition-colors",
                        isTopPerformer && "bg-success/5"
                      )}
                    >
                      {/* 配信タイトル */}
                      <td className="py-5 px-6">
                        <div className="flex items-start gap-2">
                          {isTopPerformer && (
                            <Trophy className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-neutral-ink">{report.streamTitle}</p>
                            <p className="text-xs text-neutral-sub mt-1">{report.datetime}</p>
                          </div>
                        </div>
                      </td>

                      {/* 投稿文 */}
                      <td className="py-5 px-6">
                        <div className="max-w-md">
                          <p className="text-xs text-neutral-sub mb-1">{report.template} ({report.variant})</p>
                          <p className="text-sm text-neutral-ink leading-relaxed line-clamp-2">
                            {report.body}
                          </p>
                        </div>
                      </td>

                      {/* クリック */}
                      <td className="py-5 px-6">
                        <div className="text-right">
                          <p className="text-base font-semibold text-neutral-ink">{report.clicks}</p>
                          <p className="text-xs text-neutral-sub mt-0.5">
                            {((report.clicks / totalClicks) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </td>

                      {/* 獲得視聴者 */}
                      <td className="py-5 px-6">
                        <div className="text-right">
                          <p className={cn("text-base font-bold", liftColor)}>+{report.lift}</p>
                          <p className="text-xs text-neutral-sub mt-0.5">
                            {((report.lift / totalLift) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </td>

                      {/* 視聴率 */}
                      <td className="py-5 px-6">
                        <div className="text-right">
                          <p className="text-base font-semibold text-neutral-ink">{(report.conversion * 100).toFixed(1)}%</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {report.conversion > avgConversion ? (
                              <>
                                <ArrowUp className="h-3 w-3 text-success" strokeWidth={2.5} />
                                <span className="text-xs text-success font-medium">平均以上</span>
                              </>
                            ) : (
                              <>
                                <ArrowDown className="h-3 w-3 text-neutral-sub" strokeWidth={2.5} />
                                <span className="text-xs text-neutral-sub">平均以下</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* アクション */}
                      <td className="py-5 px-6">
                        <Button variant="outline" size="sm" className="text-xs whitespace-nowrap">
                          テンプレートに追加
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
