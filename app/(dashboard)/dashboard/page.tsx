"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Bell } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-provider";
import { requireClientAuth } from "@/lib/client-auth";
// import { TutorialWelcomeCard } from "@/components/tutorial/TutorialWelcomeCard";

interface DashboardData {
  recommendation: {
    time: string;
    template: string;
    reason: string;
  };
  kpi: {
    today_called_viewers: number;
    today_clicks_sum: number;
    per_post_click_avg: number;
    per_post_called_avg: number;
    conversion_rate: number;
    total_posts: number;
  };
  winners: {
    best_template: {
      name: string;
      snippet: string;
      called_viewers: number;
      clicks: number;
    } | null;
  };
  templateStats: Array<{
    name: string;
    uses: number;
    avgCalledViewers: number;
    avgClicks: number;
  }>;
  timeline: Array<{
    time: string;
    viewers: number;
    clicks: number;
    announcement?: boolean;
  }>;
  recentPosts: Array<{
    time: string;
    snippet: string;
    clicks: number;
    called_viewers: number;
    status: string;
    stream_id: number;
  }>;
  banners: {
    x_link_error: boolean;
    push_disabled: boolean;
    no_templates: boolean;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const timer = setTimeout(() => {
      document.title = "ダッシュボード | CastCue";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Check Service Worker subscription status
  useEffect(() => {
    async function checkPushSubscription() {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setPushSubscribed(!!subscription);
        } catch (error) {
          console.error('[Dashboard] Error checking subscription:', error);
          setPushSubscribed(false);
        }
      }
    }

    checkPushSubscription();
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // 認証チェック（Supabaseセッションまたはカスタムセッション）
        const authStatus = await requireClientAuth(router);
        if (!authStatus) {
          return; // リダイレクト処理はrequireClientAuthが行う
        }

        // ダッシュボードデータ取得
        const response = await fetch("/api/dashboard?range=1d");

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
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

  if (!data) {
    return null;
  }

  const { recommendation, kpi, winners, templateStats, timeline, recentPosts, banners } = data;

  // タイムラインデータがない場合のフォールバック
  const timelineData = timeline && timeline.length > 0 ? timeline : [
    { time: 'データなし', viewers: 0, clicks: 0 }
  ];

  return (
    <div className="space-y-4">
      {/* チュートリアルウェルカムカード */}
      {/* <TutorialWelcomeCard /> */}

      {/* アラート（上部） */}
      {(banners.x_link_error || !pushSubscribed || banners.no_templates) && (
        <div className="space-y-3">
          {banners.no_templates && (
            <Card className="border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-primary/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">
                        投稿テンプレートを作成してください
                      </p>
                      <Button variant="outline" size="sm" onClick={() => router.push('/templates')} className="flex-shrink-0">
                        作成
                      </Button>
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline list-none">
                        <span className="inline-flex items-center gap-1">
                          詳細を確認
                          <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </summary>
                      <div className="mt-2 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                          <strong>テンプレートとは？</strong>
                        </p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                          配信開始時にXに投稿する文面のテンプレートです。複数のテンプレートを作成して、効果を比較できます。
                        </p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400">
                          テンプレートが未作成の場合、「配信を開始しました！ぜひ見に来てください」というデフォルトテンプレートが使用されます。
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {banners.x_link_error && (
            <Card className="border-danger/30 dark:border-danger/40 bg-danger/5 dark:bg-danger/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">
                        Xアカウントを連携してください
                      </p>
                      <Button variant="outline" size="sm" onClick={() => router.push('/integrations')} className="flex-shrink-0">
                        連携
                      </Button>
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-medium text-danger hover:underline list-none">
                        <span className="inline-flex items-center gap-1">
                          詳細を確認
                          <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </summary>
                      <div className="mt-2 pl-4 border-l-2 border-danger/20 dark:border-danger/30">
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                          <strong>X連携とは？</strong>
                        </p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                          Twitch配信開始時に、Xアカウントに告知ツイートを投稿する機能です。
                        </p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                          通知から「テンプレートで投稿」で自動投稿、または「編集して投稿」で内容を確認・編集してから投稿できます。
                        </p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400">
                          連携が切れている場合、配信開始通知が投稿されません。「再接続」ボタンから再度X連携を行ってください。
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {!pushSubscribed && (
            <Card className="border-warning/30 dark:border-warning/40 bg-warning/5 dark:bg-warning/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">
                        プッシュ通知を設定してください
                      </p>
                      <Button variant="outline" size="sm" onClick={() => router.push('/integrations')} className="flex-shrink-0">
                        設定
                      </Button>
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-medium text-warning hover:underline list-none">
                        <span className="inline-flex items-center gap-1">
                          詳細を確認
                          <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </summary>
                      <div className="mt-2 pl-4 border-l-2 border-warning/20 dark:border-warning/30">
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                          <strong>ブラウザ通知とは？</strong>
                        </p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                          Twitch配信開始時に、ブラウザ経由で通知を受け取る機能です。通知から投稿内容を確認・編集して、Xに投稿できます。
                        </p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400">
                          ブラウザ通知を有効にすると、配信開始時に即座に通知が届き、投稿前に内容を確認できます。「有効化」ボタンから設定してください。
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ヒーローKPI - 告知の効果を大きく表示 */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* 累計で呼べた人数 */}
        <Card className="relative overflow-hidden border-l-4 border-l-[#16A34A] dark:border-l-[#10B981]">
          <CardContent className="p-5">
            <p className="text-xs text-neutral-sub dark:text-gray-400 mb-3">累計で呼べた人数</p>
            <p className="text-4xl font-bold text-[#16A34A] dark:text-[#10B981] mb-2">
              +{kpi.today_called_viewers.toLocaleString()}
            </p>
            <div className="flex items-center gap-3 text-xs text-neutral-sub dark:text-gray-400">
              <span>平均 <span className="font-semibold text-neutral-ink dark:text-gray-200">{kpi.per_post_called_avg}</span>/投稿</span>
              <span>全{kpi.total_posts}回</span>
            </div>
          </CardContent>
        </Card>

        {/* 累計クリック数 */}
        <Card className="relative overflow-hidden border-l-4 border-l-[#4F46E5] dark:border-l-[#6366F1]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-neutral-sub dark:text-gray-400">累計クリック数</p>
              <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#6366F1]">CVR {kpi.conversion_rate}%</span>
            </div>
            <p className="text-4xl font-bold text-[#4F46E5] dark:text-[#6366F1] mb-2">
              {kpi.today_clicks_sum.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-sub dark:text-gray-400">
              平均 <span className="font-semibold text-neutral-ink dark:text-gray-200">{kpi.per_post_click_avg}</span>/投稿
            </p>
          </CardContent>
        </Card>

        {/* 一番効いた文面 */}
        <Card className="relative overflow-hidden border-l-4 border-l-[#F59E0B] dark:border-l-[#FCD34D]">
          <CardContent className="p-5">
            <p className="text-xs text-neutral-sub dark:text-gray-400 mb-3">一番効いた文面</p>
            {winners.best_template ? (
              <>
                <p className="text-lg font-bold text-neutral-ink dark:text-gray-100 mb-3 truncate">
                  {winners.best_template.name}
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-[#16A34A] dark:text-[#10B981]">+{winners.best_template.called_viewers}</p>
                    <p className="text-xs text-neutral-sub dark:text-gray-400">呼べた</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#4F46E5] dark:text-[#6366F1]">{winners.best_template.clicks}</p>
                    <p className="text-xs text-neutral-sub dark:text-gray-400">クリック</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-sub dark:text-gray-400">データなし</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* テンプレート比較（重要度：高） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">何が効いた？</CardTitle>
          <CardDescription className="text-xs">テンプレート別のパフォーマンス比較</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          {/* テンプレート統計 */}
          {templateStats && templateStats.length > 0 && (() => {
            // 最大値を取得（Progress バーのスケール用）
            const maxCalledViewers = Math.max(...templateStats.map(s => s.avgCalledViewers));
            const maxClicks = Math.max(...templateStats.map(s => s.avgClicks));

            return (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {templateStats.map((stat, i) => {
                  const isTopPerformer = stat.avgCalledViewers === maxCalledViewers;
                  const calledViewersPercent = maxCalledViewers > 0 ? (stat.avgCalledViewers / maxCalledViewers) * 100 : 0;
                  const clicksPercent = maxClicks > 0 ? (stat.avgClicks / maxClicks) * 100 : 0;

                  return (
                    <div key={i} className={`p-3 rounded border ${isTopPerformer ? 'bg-[#F59E0B]/5 dark:bg-[#FCD34D]/10 border-[#F59E0B] dark:border-[#FCD34D]' : 'border-neutral-border dark:border-gray-700'}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100 truncate">
                          {stat.name}
                        </p>
                        {isTopPerformer && (
                          <span className="text-xs font-bold text-[#F59E0B] dark:text-[#FCD34D]">
                            TOP
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-sub dark:text-gray-400 mb-3">{stat.uses}回使用</div>

                      {/* 呼べた人数の進捗バー */}
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-sub dark:text-gray-400">呼べた</span>
                          <span className="text-sm font-bold text-[#16A34A] dark:text-[#10B981]">+{stat.avgCalledViewers}</span>
                        </div>
                        <Progress value={calledViewersPercent} className="h-1.5 bg-neutral-border/30 dark:bg-gray-600" indicatorClassName="bg-[#16A34A] dark:bg-[#10B981]" />
                      </div>

                      {/* クリック数の進捗バー */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-sub dark:text-gray-400">クリック</span>
                          <span className="text-sm font-bold text-[#4F46E5] dark:text-[#6366F1]">{stat.avgClicks}</span>
                        </div>
                        <Progress value={clicksPercent} className="h-1.5 bg-neutral-border/30 dark:bg-gray-600" indicatorClassName="bg-[#4F46E5] dark:bg-[#6366F1]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {(!templateStats || templateStats.length === 0) && (
            <div className="text-center py-8">
              <p className="text-sm font-semibold text-neutral-sub dark:text-gray-400 mb-1">データなし</p>
              <p className="text-xs text-neutral-sub/70 dark:text-gray-500">配信を開始すると表示されます</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 前回の配信グラフ（補助情報） */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">前回の配信</CardTitle>
          <CardDescription className="text-xs">10分毎のサンプリングデータ</CardDescription>
        </CardHeader>
        <CardContent className="pb-2 pl-1">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={timelineData}
              margin={{ top: 5, right: 35, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E2E8F0"} />
              <XAxis
                dataKey="time"
                stroke={isDark ? "#9ca3af" : "#475569"}
                style={{ fontSize: '10px' }}
                tick={{ fill: isDark ? '#d1d5db' : '#475569', fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                stroke={isDark ? "#818cf8" : "#4F46E5"}
                style={{ fontSize: '10px' }}
                width={38}
                tick={{ fill: isDark ? '#a5b4fc' : '#4F46E5', fontSize: 10 }}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value.toString();
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={isDark ? "#34d399" : "#10B981"}
                style={{ fontSize: '10px' }}
                width={32}
                tick={{ fill: isDark ? '#6ee7b7' : '#10B981', fontSize: 10 }}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value.toString();
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1f2937' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#374151' : '#E2E8F0'}`,
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: isDark ? '#f3f4f6' : '#0f172a'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', color: isDark ? '#d1d5db' : '#64748b' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="viewers"
                stroke="#4F46E5"
                strokeWidth={1.5}
                name="同接"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="clicks"
                stroke="#10B981"
                strokeWidth={1.5}
                name="クリック"
                dot={false}
              />
              {/* Dynamic announcement markers based on real data */}
              {timeline && timeline.length > 0 && timeline.filter(t => t.announcement).map((announcementPoint, idx) => (
                <ReferenceLine
                  key={idx}
                  x={announcementPoint.time}
                  stroke={isDark ? "#fbbf24" : "#F59E0B"}
                  strokeDasharray="3 3"
                  label={{ value: '告知', position: 'top', fill: isDark ? '#fbbf24' : '#F59E0B', fontSize: 9 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 最近の告知 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">最近の告知</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/streams')}
            >
              すべて
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {recentPosts.length > 0 ? (
            <div className="space-y-2">
              {recentPosts.map((post, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded border border-neutral-border dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-colors cursor-pointer group"
                  onClick={() => router.push(`/streams/${post.stream_id}`)}
                >
                  {/* 時刻 */}
                  <div className="flex-shrink-0">
                    <span className="text-xs font-semibold text-neutral-sub dark:text-gray-400">{post.time}</span>
                  </div>

                  {/* 投稿内容 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-ink dark:text-gray-100 line-clamp-1 group-hover:text-[#4F46E5] dark:group-hover:text-[#6366F1] transition-colors mb-1">
                      {post.snippet}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-neutral-sub dark:text-gray-400">
                        クリック <span className="font-semibold text-[#4F46E5] dark:text-[#6366F1]">{post.clicks}</span>
                      </span>
                      <span className="text-neutral-sub dark:text-gray-400">
                        呼べた <span className="font-semibold text-[#16A34A] dark:text-[#10B981]">+{post.called_viewers}</span>
                      </span>
                    </div>
                  </div>

                  {/* ステータス */}
                  <div className="flex-shrink-0">
                    <span className="text-xs text-[#16A34A] dark:text-[#10B981]">
                      送信済
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm font-semibold text-neutral-sub dark:text-gray-400 mb-1">まだ告知がありません</p>
              <p className="text-xs text-neutral-sub/70 dark:text-gray-500">配信を開始すると自動で投稿されます</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
