"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Calendar, Search, TrendingUp, Users, MousePointerClick, Trophy, Sparkles, ArrowUp, ArrowDown, Loader2, AlertCircle, HelpCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  datetime: string;
  streamId: number;
  streamTitle: string;
  template: string;
  clicks: number;
  called_viewers: number;
  conversion: number;
  status: string;
  body: string;
}

interface TemplateComparison {
  id: string;
  name: string;
  count: number;
  avgCalledViewers: number;
  avgClicks: number;
  avgConversion: number;
  bestRecord: {
    calledViewers: number;
    date: string;
  };
}

interface ReportsData {
  summary: {
    totalReports: number;
    totalClicks: number;
    totalCalledViewers: number;
    avgConversion: number;
  };
  bestReport: Report | null;
  templateStats: Record<string, { count: number; totalCalledViewers: number; totalClicks: number }>;
  templateComparison: TemplateComparison[];
  reports: Report[];
}

// Tooltip component
function Tooltip({ text, align = "left" }: { text: string; align?: "left" | "right" }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="ml-1 text-neutral-sub dark:text-gray-400 hover:text-primary transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => e.preventDefault()}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {show && (
        <div className={cn(
          "absolute bottom-full mb-2 z-50 w-64 p-3 bg-neutral-ink dark:bg-gray-800 text-white text-xs rounded-md shadow-lg border border-neutral-border dark:border-gray-700",
          align === "left" ? "left-0" : "right-0"
        )}>
          {text}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      document.title = "レポート | CastCue";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
  }, [period, searchQuery, supabase, router]);

  // APIからデータを取得
  const reports = data?.reports || [];

  // サマリー計算
  const totalClicks = data?.summary.totalClicks || 0;
  const totalCalledViewers = data?.summary.totalCalledViewers || 0;
  const avgConversion = data?.summary.avgConversion || 0;
  const bestReport = data?.bestReport || null;

  // テンプレート別集計
  const templateStats = data?.templateStats || {};

  const handleSaveAsTemplate = async (report: Report) => {
    try {
      setSavingTemplateId(report.id);

      // テンプレート名を生成（配信タイトルから）
      const templateName = `${report.streamTitle.slice(0, 20)}... のテンプレート`;

      // 投稿内容からTwitch URLを除去してテンプレート本文を抽出
      const bodyWithoutUrl = report.body.replace(/https:\/\/twitch\.tv\/\S+\s*$/, '').trim();

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          body: bodyWithoutUrl
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Template Save] Error response:', errorData);
        throw new Error(errorData.error || `テンプレートの保存に失敗しました (${response.status})`);
      }

      setSaveMessage({ type: 'success', text: 'テンプレートとして保存しました' });
    } catch (error: any) {
      console.error('テンプレート保存エラー:', error);
      setSaveMessage({ type: 'error', text: `保存に失敗しました: ${error.message}` });
    } finally {
      setSavingTemplateId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-neutral-sub dark:text-gray-400">読み込み中...</p>
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
            <p className="text-body text-neutral-ink dark:text-gray-100 mb-4">データの読み込みに失敗しました</p>
            <p className="text-small text-neutral-sub dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>再読み込み</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Message Modal */}
      {saveMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSaveMessage(null)}
        >
          <Card
            className={`max-w-md w-full mx-4 ${saveMessage.type === 'success' ? 'border-success' : 'border-danger'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {saveMessage.type === 'success' ? (
                    <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-danger flex-shrink-0" />
                  )}
                  <p className="text-body font-medium text-neutral-ink dark:text-gray-100">
                    {saveMessage.text}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setSaveMessage(null)}
                    variant="default"
                  >
                    閉じる
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-neutral-ink dark:text-gray-100">レポート</h1>
        <p className="text-neutral-sub dark:text-gray-400">過去の投稿実績を分析</p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-neutral-border dark:border-gray-700 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <p className="text-sm text-neutral-sub dark:text-gray-400">合計告知数</p>
                  <Tooltip text="期間中に送信されたX（Twitter）への告知投稿の総数です。配信開始時に自動または手動で投稿した回数をカウントしています。" />
                </div>
                <p className="text-4xl font-bold text-neutral-ink dark:text-gray-100">{reports.length}</p>
                <p className="text-xs text-neutral-sub dark:text-gray-400 mt-2">回投稿</p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-primary" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-border dark:border-gray-700 hover:border-success/50 hover:shadow-xl hover:shadow-success/10 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <p className="text-sm text-neutral-sub dark:text-gray-400">合計クリック数</p>
                  <Tooltip text="告知投稿に含まれる配信URLがクリックされた回数の合計です。X（Twitter）経由で配信に興味を持った人数を示します。" />
                </div>
                <p className="text-4xl font-bold text-neutral-ink dark:text-gray-100">{totalClicks}</p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                  平均 {reports.length > 0 ? (totalClicks / reports.length).toFixed(1) : '0'}回/投稿
                </p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-success/10 to-success/5 dark:from-success/20 dark:to-success/10 flex items-center justify-center">
                <MousePointerClick className="h-7 w-7 text-success" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-border dark:border-gray-700 hover:border-success/50 hover:shadow-xl hover:shadow-success/10 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <p className="text-sm text-neutral-sub dark:text-gray-400">呼べた人数</p>
                  <Tooltip text="告知投稿後に増加した視聴者数の合計です。投稿前後の視聴者数を比較し、告知によって配信に来てくれた人数を推定しています。" align="right" />
                </div>
                <p className="text-4xl font-bold text-neutral-ink dark:text-gray-100">+{totalCalledViewers}</p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                  平均 +{reports.length > 0 ? (totalCalledViewers / reports.length).toFixed(1) : '0'}人/投稿
                </p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-success/10 to-success/5 dark:from-success/20 dark:to-success/10 flex items-center justify-center">
                <Users className="h-7 w-7 text-success" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-border dark:border-gray-700 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <p className="text-sm text-neutral-sub dark:text-gray-400">クリック経由率</p>
                  <Tooltip text="URLをクリックした人のうち、実際に配信を見に来た人の割合です。高いほどクリックから視聴へのコンバージョンが高いことを示します。（呼べた人数÷クリック数×100）" align="right" />
                </div>
                <p className="text-4xl font-bold text-neutral-ink dark:text-gray-100">{avgConversion.toFixed(1)}%</p>
                <p className="text-xs text-neutral-sub dark:text-gray-400 mt-2">クリックした人のうち視聴した割合</p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-primary" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* インサイト */}
      <Card className="border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/5 to-success/5 dark:from-primary/10 dark:to-success/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg dark:text-gray-100">
            <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.75} />
            </div>
            インサイトとおすすめ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* ベストパフォーマンス */}
            {bestReport ? (
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 border border-success/20 dark:border-success/30 hover:border-success/40 transition-all duration-300">
                <div className="h-10 w-10 bg-gradient-to-br from-success/10 to-success/5 dark:from-success/20 dark:to-success/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-6 w-6 text-success" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">最も効果的だった告知</p>
                  <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                    {bestReport.datetime} の投稿で <span className="font-bold text-success">+{bestReport.called_viewers}人</span> を呼べた
                  </p>
                  <p className="text-xs text-neutral-ink dark:text-gray-100 mt-2 bg-neutral-bg dark:bg-gray-700 p-2">
                    「{bestReport.body}」
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 border border-neutral-border dark:border-gray-700">
                <div className="h-10 w-10 bg-neutral-bg dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-6 w-6 text-neutral-sub dark:text-gray-400" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">最も効果的だった告知</p>
                  <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                    まだ配信データがありません。配信を行うとここに統計情報が表示されます。
                  </p>
                </div>
              </div>
            )}

            {/* テンプレート比較 */}
            <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 border border-neutral-border dark:border-gray-700 hover:border-primary/40 transition-all duration-300">
              <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">テンプレート別パフォーマンス</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(templateStats).map(([variant, stats]) => (
                    <div key={variant} className="flex items-center gap-2">
                      <span className="inline-flex items-center bg-primary/10 dark:bg-primary/20 px-2 py-1 text-xs font-medium text-primary min-w-[32px] justify-center">
                        {variant}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-border dark:bg-gray-700 h-2">
                            <div
                              className="bg-primary h-2"
                              style={{ width: `${(stats.totalCalledViewers / totalCalledViewers) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-neutral-ink dark:text-gray-100 min-w-[80px] text-right">
                            平均 +{(stats.totalCalledViewers / stats.count).toFixed(1)}人
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
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 border border-primary/20 dark:border-primary/30 hover:border-primary/40 transition-all duration-300">
                <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">次回のおすすめ</p>
                  <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                    {bestReport.template} の効果が高いです。次回も同じテンプレートを使うと効果的かもしれません。
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* テンプレート比較セクション */}
      {data?.templateComparison && data.templateComparison.length > 0 && (
        <Card className="border-neutral-border dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg dark:text-gray-100">
              <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </div>
              テンプレート比較
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {data.templateComparison.map((template, index) => {
                const isLowSample = template.count < 3;
                const isBest = data.templateComparison.length > 1 &&
                  template.avgCalledViewers === Math.max(...data.templateComparison.map(t => t.avgCalledViewers));

                return (
                  <Card
                    key={template.id}
                    className={cn(
                      "border-2 transition-all duration-300",
                      isBest ? "border-success/40 dark:border-success/50 bg-success/5 dark:bg-success/10" : "border-neutral-border dark:border-gray-700 hover:border-primary/30"
                    )}
                  >
                    <CardContent className="p-6 space-y-4">
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-neutral-ink dark:text-gray-100">{template.name}</h3>
                            {isBest && (
                              <Trophy className="h-5 w-5 text-success" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary font-medium">
                              使用回数: {template.count}回
                            </span>
                            {isLowSample && (
                              <span className="text-xs px-2 py-1 bg-warning/10 dark:bg-warning/20 text-warning font-medium">
                                サンプル少
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 統計データ */}
                      <div className="space-y-3">
                        {/* 平均呼べた人数 */}
                        <div className="flex items-center justify-between p-3 bg-neutral-bg dark:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-success" />
                            <span className="text-sm text-neutral-sub dark:text-gray-400">平均呼べた人数</span>
                          </div>
                          <span className="text-xl font-bold text-success">+{template.avgCalledViewers}人</span>
                        </div>

                        {/* 平均クリック数 */}
                        <div className="flex items-center justify-between p-3 bg-neutral-bg dark:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <MousePointerClick className="h-4 w-4 text-primary" />
                            <span className="text-sm text-neutral-sub dark:text-gray-400">平均クリック数</span>
                          </div>
                          <span className="text-xl font-bold text-primary">{template.avgClicks}回</span>
                        </div>

                        {/* 平均クリック経由率 */}
                        <div className="flex items-center justify-between p-3 bg-neutral-bg dark:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-neutral-ink dark:text-gray-100" />
                            <span className="text-sm text-neutral-sub dark:text-gray-400">平均クリック経由率</span>
                          </div>
                          <span className="text-xl font-bold text-neutral-ink dark:text-gray-100">{template.avgConversion}%</span>
                        </div>

                        {/* 最高記録 */}
                        {template.bestRecord.calledViewers > 0 && (
                          <div className="p-3 bg-gradient-to-r from-warning/10 to-warning/5 dark:from-warning/20 dark:to-warning/10 border border-warning/20 dark:border-warning/30">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-warning mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs text-neutral-sub dark:text-gray-400">最高記録</p>
                                <p className="text-sm font-bold text-neutral-ink dark:text-gray-100 mt-1">
                                  +{template.bestRecord.calledViewers}人
                                  <span className="text-xs font-normal text-neutral-sub dark:text-gray-400 ml-2">
                                    ({template.bestRecord.date})
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 注意書き */}
                      {isLowSample && (
                        <div className="pt-3 border-t border-neutral-border dark:border-gray-700">
                          <p className="text-xs text-neutral-sub dark:text-gray-400">
                            ※ サンプル数が少ないため参考程度にご覧ください。より正確な比較には3回以上の使用を推奨します。
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 推奨メッセージ */}
            {data.templateComparison.length > 1 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-success/10 dark:from-primary/20 dark:to-success/20 border border-primary/20 dark:border-primary/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-neutral-ink dark:text-gray-100 mb-1">推奨</p>
                    <p className="text-sm text-neutral-sub dark:text-gray-400">
                      {(() => {
                        const best = data.templateComparison.reduce((a, b) =>
                          a.avgCalledViewers > b.avgCalledViewers ? a : b
                        );
                        const allLowSample = data.templateComparison.every(t => t.count < 3);

                        if (allLowSample) {
                          return "まだサンプル数が少ないため、引き続き両方のテンプレートを試して効果を測定することをおすすめします。";
                        }

                        return `「${best.name}」の方が平均 +${best.avgCalledViewers}人 と効果的な傾向があります（使用回数：${best.count}回）。次回も同じテンプレートを使うと効果が期待できます。`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-sub dark:text-gray-400" strokeWidth={1.75} />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="today">今日</option>
                <option value="7days">7日間</option>
                <option value="30days">30日間</option>
                <option value="custom">カスタム</option>
              </select>
            </div>

            {/* Template Filter */}
            <select className="px-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">すべてのテンプレート</option>
              <option value="a">熱量重視型テンプレート</option>
              <option value="b">カジュアル型テンプレート</option>
              <option value="c">ランクマ用テンプレート</option>
            </select>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-sub dark:text-gray-400" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="本文を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 placeholder:text-neutral-sub dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="dark:text-gray-100">告知一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-neutral-border dark:border-gray-700 bg-neutral-bg/50 dark:bg-gray-700/50">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-neutral-ink dark:text-gray-100">配信タイトル</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-neutral-ink dark:text-gray-100">投稿文</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-neutral-ink dark:text-gray-100">クリック</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-neutral-ink dark:text-gray-100">呼べた人数</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-neutral-ink dark:text-gray-100">クリック経由率</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  // 相対的な良し悪しを計算
                  const isTopPerformer = bestReport && report.called_viewers >= bestReport.called_viewers * 0.8;
                  const calledViewersColor = report.called_viewers > 15 ? "text-success" : report.called_viewers > 10 ? "text-primary" : "text-neutral-ink dark:text-gray-100";

                  return (
                    <tr
                      key={report.id}
                      className={cn(
                        "border-b border-neutral-border dark:border-gray-700 hover:bg-neutral-bg/30 dark:hover:bg-gray-700/30 transition-colors",
                        isTopPerformer && "bg-success/5 dark:bg-success/10"
                      )}
                    >
                      {/* 配信タイトル */}
                      <td className="py-5 px-6">
                        <div className="flex items-start gap-2">
                          {isTopPerformer && (
                            <Trophy className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">{report.streamTitle}</p>
                            <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">{report.datetime}</p>
                          </div>
                        </div>
                      </td>

                      {/* 投稿文 */}
                      <td className="py-5 px-6">
                        <div className="max-w-md">
                          <p className="text-xs text-neutral-sub dark:text-gray-400 mb-1">{report.template}</p>
                          <p className="text-sm text-neutral-ink dark:text-gray-100 leading-relaxed line-clamp-2">
                            {report.body}
                          </p>
                        </div>
                      </td>

                      {/* クリック */}
                      <td className="py-5 px-6">
                        <div className="text-right">
                          <p className="text-base font-semibold text-neutral-ink dark:text-gray-100">{report.clicks}</p>
                          <p className="text-xs text-neutral-sub dark:text-gray-400 mt-0.5">
                            {((report.clicks / totalClicks) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </td>

                      {/* 呼べた人数 */}
                      <td className="py-5 px-6">
                        <div className="text-right">
                          <p className={cn("text-base font-bold", calledViewersColor)}>+{report.called_viewers}</p>
                          <p className="text-xs text-neutral-sub dark:text-gray-400 mt-0.5">
                            {((report.called_viewers / totalCalledViewers) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </td>

                      {/* クリック経由率 */}
                      <td className="py-5 px-6">
                        <div className="text-right">
                          <p className="text-base font-semibold text-neutral-ink dark:text-gray-100">{report.conversion.toFixed(1)}%</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {report.conversion > avgConversion ? (
                              <>
                                <ArrowUp className="h-3 w-3 text-success" strokeWidth={2.5} />
                                <span className="text-xs text-success font-medium">平均以上</span>
                              </>
                            ) : (
                              <>
                                <ArrowDown className="h-3 w-3 text-neutral-sub dark:text-gray-400" strokeWidth={2.5} />
                                <span className="text-xs text-neutral-sub dark:text-gray-400">平均以下</span>
                              </>
                            )}
                          </div>
                        </div>
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
