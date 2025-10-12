"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Bell } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface DashboardData {
  recommendation: {
    time: string;
    template: string;
    reason: string;
  };
  kpi: {
    today_lift_sum: number;
    today_clicks_sum: number;
    per_post_click_avg: number;
  };
  winners: {
    best_template: {
      name: string;
      snippet: string;
      lift: number;
      clicks: number;
    } | null;
    ab_winrate: {
      A: number;
      B: number;
    };
  };
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
    lift: number;
    status: string;
  }>;
  banners: {
    x_link_error: boolean;
    push_disabled: boolean;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // 認証チェック
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
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

  const { recommendation, kpi, winners, timeline, recentPosts, banners } = data;

  // タイムラインデータがない場合のフォールバック
  const timelineData = timeline && timeline.length > 0 ? timeline : [
    { time: 'データなし', viewers: 0, clicks: 0 }
  ];

  return (
    <div className="space-y-4">
      {/* F. アラート（上部） */}
      {(banners.x_link_error || banners.push_disabled) && (
        <div className="space-y-3">
          {banners.x_link_error && (
            <div className="flex items-center gap-3 p-3 bg-danger/10 border border-danger/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
              <p className="text-small text-neutral-ink flex-1">Xの連携が切れています</p>
              <Button variant="outline" size="sm">再接続</Button>
            </div>
          )}
          {banners.push_disabled && (
            <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-md">
              <Bell className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-small text-neutral-ink flex-1">ブラウザ通知が無効です</p>
              <Button variant="outline" size="sm">有効化</Button>
            </div>
          )}
        </div>
      )}

      {/* 上部：次のおすすめ + KPI */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* 次のおすすめ */}
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-neutral-sub mb-1">次のおすすめ</p>
            <p className="text-small text-neutral-ink">
              <span className="font-bold text-primary">{recommendation.time}</span> に
              <span className="font-bold">テンプレ{recommendation.template}</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI */}
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-neutral-sub mb-1">呼べた人（推定）</p>
            <p className="text-h2 font-bold text-neutral-ink">+{kpi.today_lift_sum}人</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-neutral-sub mb-1">リンクを押した人</p>
            <p className="text-h2 font-bold text-neutral-ink">{kpi.today_clicks_sum}人</p>
          </CardContent>
        </Card>
      </div>

      {/* グラフとテーブルを横並び */}
      <div className="grid gap-3 lg:grid-cols-5">
        {/* グラフ */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-body">今日の流れ</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="time" stroke="#475569" style={{ fontSize: '11px' }} />
                <YAxis yAxisId="left" stroke="#4F46E5" style={{ fontSize: '11px' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10B981" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="viewers"
                  stroke="#4F46E5"
                  strokeWidth={1.5}
                  name="同接"
                  dot={{ fill: '#4F46E5', r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="clicks"
                  stroke="#10B981"
                  strokeWidth={1.5}
                  name="クリック"
                  dot={{ fill: '#10B981', r: 2 }}
                />
                <ReferenceLine x="14:30" stroke="#F59E0B" strokeDasharray="3 3" label={{ value: '告知', position: 'top', fill: '#F59E0B', fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 勝ちパターン（コンパクト） */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-body">何が効いた？</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-3">
            {/* 一番効いた文面 */}
            <div>
              <p className="text-xs font-medium text-neutral-sub mb-1">一番効いた文面</p>
              {winners.best_template ? (
                <div className="p-2 bg-neutral-bg rounded-md">
                  <p className="text-xs text-neutral-ink font-medium">{winners.best_template.name}</p>
                  <p className="text-xs text-neutral-sub truncate">「{winners.best_template.snippet}」</p>
                  <div className="flex gap-2 text-xs mt-1">
                    <span className="text-success font-medium">+{winners.best_template.lift}人</span>
                    <span className="text-neutral-sub">クリック {winners.best_template.clicks}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-neutral-bg rounded-md">
                  <p className="text-xs text-neutral-sub">データなし</p>
                </div>
              )}
            </div>

            {/* A/B勝率 */}
            <div>
              <p className="text-xs font-medium text-neutral-sub mb-1">テンプレ勝率</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-ink w-5">A</span>
                  <div className="flex-1 bg-neutral-border rounded-full h-1">
                    <div className="bg-primary rounded-full h-1" style={{ width: `${winners.ab_winrate.A}%` }}></div>
                  </div>
                  <span className="text-xs font-medium text-neutral-ink w-9 text-right">{winners.ab_winrate.A}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-ink w-5">B</span>
                  <div className="flex-1 bg-neutral-border rounded-full h-1">
                    <div className="bg-primary rounded-full h-1" style={{ width: `${winners.ab_winrate.B}%` }}></div>
                  </div>
                  <span className="text-xs font-medium text-neutral-ink w-9 text-right">{winners.ab_winrate.B}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近の告知（コンパクト） */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body">最近の告知</CardTitle>
            <Button variant="ghost" size="sm">すべて</Button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="space-y-1">
            {recentPosts.map((post, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-neutral-border last:border-0">
                <span className="text-xs text-neutral-sub w-11">{post.time}</span>
                <span className="text-xs text-neutral-ink flex-1 truncate">{post.snippet}</span>
                <span className="text-xs text-neutral-ink font-medium w-14 text-right">{post.clicks}click</span>
                <span className="text-xs text-success font-medium w-12 text-right">+{post.lift}</span>
                <span className="inline-flex items-center rounded-sm bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success w-14 justify-center">
                  送信済
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
