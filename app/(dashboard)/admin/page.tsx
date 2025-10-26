"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Users, TrendingUp, Activity, Server, RefreshCw, Key, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-provider";
import type { AdminStatsResponse } from "@/types/admin";
import { requireClientAuth } from "@/lib/client-auth";

export default function AdminPage() {
  const [data, setData] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const timer = setTimeout(() => {
      document.title = "管理画面 | CastCue";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Load saved password from sessionStorage (more secure than localStorage)
  // Note: sessionStorage is cleared when the browser tab is closed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPassword = sessionStorage.getItem('castcue_admin_password');
      if (savedPassword) {
        setAdminPassword(savedPassword);
      } else {
        setShowPasswordInput(true);
        setLoading(false);
      }
    }
  }, []);

  const fetchAdminStats = useCallback(async (password: string) => {
    try {
      setLoading(true);
      setError(null);

      // 認証チェック（Supabaseセッションまたはカスタムセッション）
      const authStatus = await requireClientAuth(router);
      if (!authStatus) {
        return; // リダイレクト処理はrequireClientAuthが行う
      }

      // 管理画面統計データ取得
      const response = await fetch("/api/admin/stats", {
        headers: {
          "X-Admin-Password": password,
        },
      });

      if (response.status === 403) {
        // パスワードが間違っている、または管理者ではない
        sessionStorage.removeItem('castcue_admin_password');
        setShowPasswordInput(true);
        throw new Error("管理者権限がありません。パスワードを確認してください。");
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch admin stats: ${response.statusText}`);
      }

      const statsData = await response.json();
      setData(statsData);
      setLastUpdated(new Date());

      // パスワードが正しい場合は保存（sessionStorage: タブを閉じるとクリア）
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('castcue_admin_password', password);
      }
      setShowPasswordInput(false);
    } catch (err: any) {
      console.error("Error fetching admin stats:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    if (adminPassword && !showPasswordInput) {
      fetchAdminStats(adminPassword);
    }
  }, [adminPassword, showPasswordInput, fetchAdminStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !adminPassword || showPasswordInput) {
      return;
    }

    const interval = setInterval(() => {
      console.log('[Admin] Auto-refreshing stats...');
      fetchAdminStats(adminPassword);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, adminPassword, showPasswordInput, fetchAdminStats]);

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    if (password) {
      setAdminPassword(password);
      setShowPasswordInput(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('castcue_admin_password');
    setAdminPassword("");
    setShowPasswordInput(true);
    setData(null);
  }

  // パスワード入力画面
  if (showPasswordInput) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              管理者認証
            </CardTitle>
            <CardDescription>管理者パスワードを入力してください</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  name="password"
                  placeholder="管理者パスワード"
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div className="text-sm text-danger">{error}</div>
              )}
              <Button type="submit" className="w-full">
                ログイン
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <div className="flex gap-2 justify-center">
              <Button onClick={() => fetchAdminStats(adminPassword)}>再読み込み</Button>
              <Button variant="outline" onClick={handleLogout}>ログアウト</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { users, growth, activity, health, sampling } = data;

  // グラフ用データ準備（最新10日分）
  const recentGrowth = growth.daily.slice(-10);

  // アラート判定
  const hasAlerts = data && (
    health.sampling.status === 'error' ||
    health.errorRate.last24Hours >= 10
  );

  // Vercel Pro移行判断の色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'free-ok': return 'text-[#10B981] dark:text-[#10B981]';
      case 'prepare-migration': return 'text-[#F59E0B] dark:text-[#FBBF24]';
      case 'migrate-now': return 'text-[#EF4444] dark:text-[#F87171]';
      case 'critical': return 'text-danger';
      default: return 'text-neutral-ink dark:text-gray-100';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'free-ok': return 'default';
      case 'prepare-migration': return 'secondary';
      case 'migrate-now': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-ink dark:text-gray-100">管理画面</h1>
            <p className="text-sm text-neutral-sub dark:text-gray-400">CastCue システム統計</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAdminStats(adminPassword)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              更新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          </div>
        </div>

        {/* 自動更新トグルと最終更新時刻 */}
        <div className="flex items-center justify-between py-2 px-3 bg-neutral-bg dark:bg-gray-800 rounded-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                id="auto-refresh"
              />
              <label htmlFor="auto-refresh" className="text-sm text-neutral-ink dark:text-gray-100 cursor-pointer">
                自動更新（30秒）
              </label>
            </div>
            {lastUpdated && (
              <p className="text-xs text-neutral-sub dark:text-gray-400">
                最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
              </p>
            )}
          </div>
          {hasAlerts && (
            <div className="flex items-center gap-1 text-danger">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-semibold">アラートあり</span>
            </div>
          )}
        </div>
      </div>

      {/* アラート */}
      {hasAlerts && (
        <Card className="border-danger dark:border-danger bg-danger/5 dark:bg-danger/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-danger">
              <AlertTriangle className="h-5 w-5" />
              重要アラート
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {health.sampling.status === 'error' && (
              <div className="flex items-start gap-3 p-3 rounded border border-danger/30 dark:border-danger/40 bg-white dark:bg-gray-900">
                <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100 mb-1">
                    サンプリング停止検知
                  </p>
                  <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                    GitHub Actions のサンプリングが15分以上実行されていません。
                  </p>
                  <div className="text-xs text-neutral-sub dark:text-gray-400">
                    <p>最終実行: {health.sampling.lastRunAt ? new Date(health.sampling.lastRunAt).toLocaleString('ja-JP') : 'なし'}</p>
                    <p>実行間隔: {health.sampling.intervalMinutes ? `${health.sampling.intervalMinutes}分` : 'データなし'}</p>
                  </div>
                  <p className="text-xs text-danger font-semibold mt-2">
                    → GitHub Actions ワークフローを確認してください
                  </p>
                </div>
              </div>
            )}

            {health.errorRate.last24Hours >= 10 && (
              <div className="flex items-start gap-3 p-3 rounded border border-danger/30 dark:border-danger/40 bg-white dark:bg-gray-900">
                <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100 mb-1">
                    高エラー率検知
                  </p>
                  <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">
                    過去24時間のエラー率が10%を超えています。
                  </p>
                  <div className="text-xs text-neutral-sub dark:text-gray-400">
                    <p>エラー率: <span className="font-bold text-danger">{health.errorRate.last24Hours.toFixed(1)}%</span></p>
                    <p>失敗: {health.errorRate.failedPosts} / 総数: {health.errorRate.totalPosts}</p>
                  </div>
                  <p className="text-xs text-danger font-semibold mt-2">
                    → X API連携やトークンの状態を確認してください
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ユーザー統計 */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-neutral-sub dark:text-gray-400">総登録ユーザー</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold text-neutral-ink dark:text-gray-100 mb-2">
              {users.total.toLocaleString()}
            </p>
            <div className="space-y-1 text-xs text-neutral-sub dark:text-gray-400">
              <div className="flex justify-between">
                <span>Twitch連携</span>
                <span className="font-semibold">{users.twitchConnected}</span>
              </div>
              <div className="flex justify-between">
                <span>X連携</span>
                <span className="font-semibold">{users.xConnected}</span>
              </div>
              <div className="flex justify-between">
                <span>Push登録</span>
                <span className="font-semibold">{users.pushSubscribed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-neutral-sub dark:text-gray-400">アクティブユーザー</p>
              <Activity className="h-4 w-4 text-[#16A34A] dark:text-[#10B981]" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold text-[#16A34A] dark:text-[#10B981]">
                  {users.activeLastWeek}
                </p>
                <p className="text-xs text-neutral-sub dark:text-gray-400">過去7日</p>
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-ink dark:text-gray-100">
                  {users.activeLastMonth}
                </p>
                <p className="text-xs text-neutral-sub dark:text-gray-400">過去30日</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-neutral-sub dark:text-gray-400">今月の投稿</p>
              <TrendingUp className="h-4 w-4 text-[#4F46E5] dark:text-[#6366F1]" />
            </div>
            <p className="text-3xl font-bold text-[#4F46E5] dark:text-[#6366F1] mb-2">
              {activity.postsThisMonth.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-sub dark:text-gray-400">
              最終投稿: {activity.lastPostAt ? new Date(activity.lastPostAt).toLocaleString('ja-JP') : 'なし'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* システムヘルス */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-5 w-5" />
            システムヘルス
          </CardTitle>
          <CardDescription className="text-xs">cron監視とエラー率</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GitHub Actions Sampling */}
          <div className="flex items-start justify-between p-3 rounded border border-neutral-border dark:border-gray-700">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100">GitHub Actions サンプリング</p>
                <Badge variant={
                  health.sampling.status === 'healthy' ? 'default' :
                  health.sampling.status === 'warning' ? 'secondary' :
                  'destructive'
                }>
                  {health.sampling.status === 'healthy' ? '正常' :
                   health.sampling.status === 'warning' ? '警告' :
                   '異常'}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-neutral-sub dark:text-gray-400">
                <p>最終実行: {health.sampling.lastRunAt ? new Date(health.sampling.lastRunAt).toLocaleString('ja-JP') : 'なし'}</p>
                <p>実行間隔: {health.sampling.intervalMinutes ? `${health.sampling.intervalMinutes}分` : 'データなし'}</p>
              </div>
            </div>
          </div>

          {/* Vercel Cron Quota Reset */}
          <div className="flex items-start justify-between p-3 rounded border border-neutral-border dark:border-gray-700">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100">Vercel クォータリセット</p>
                <Badge variant={health.quotaReset.status === 'healthy' ? 'default' : 'destructive'}>
                  {health.quotaReset.status === 'healthy' ? '正常' : '異常'}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-neutral-sub dark:text-gray-400">
                <p>最終リセット: {health.quotaReset.lastResetDate ? new Date(health.quotaReset.lastResetDate).toLocaleDateString('ja-JP') : 'なし'}</p>
                <p>次回予定: {new Date(health.quotaReset.nextResetDate).toLocaleDateString('ja-JP')}</p>
              </div>
            </div>
          </div>

          {/* Error Rate */}
          <div className="flex items-start justify-between p-3 rounded border border-neutral-border dark:border-gray-700">
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100 mb-1">過去24時間エラー率</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-neutral-ink dark:text-gray-100">
                  {health.errorRate.last24Hours.toFixed(1)}%
                </p>
                <p className="text-xs text-neutral-sub dark:text-gray-400">
                  {health.errorRate.failedPosts}/{health.errorRate.totalPosts} 失敗
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vercel Pro移行判断 */}
      <Card className={
        sampling.recommendation.status === 'critical' || sampling.recommendation.status === 'migrate-now'
          ? 'border-danger dark:border-danger bg-danger/5 dark:bg-danger/10'
          : sampling.recommendation.status === 'prepare-migration'
          ? 'border-[#F59E0B] dark:border-[#FBBF24] bg-[#F59E0B]/5 dark:bg-[#FBBF24]/10'
          : ''
      }>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-5 w-5" />
            Vercel Pro移行判断
          </CardTitle>
          <CardDescription className="text-xs">
            現在のサンプリングメトリクスから移行タイミングを判断
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 推奨ステータス */}
          <div className={`p-4 rounded-md border ${
            sampling.recommendation.status === 'free-ok'
              ? 'border-[#10B981] dark:border-[#10B981] bg-[#10B981]/5 dark:bg-[#10B981]/10'
              : sampling.recommendation.status === 'prepare-migration'
              ? 'border-[#F59E0B] dark:border-[#FBBF24] bg-[#F59E0B]/5 dark:bg-[#FBBF24]/10'
              : 'border-danger dark:border-danger bg-danger/5 dark:bg-danger/10'
          }`}>
            <div className="flex items-start gap-3 mb-3">
              {sampling.recommendation.status === 'free-ok' ? (
                <div className="h-8 w-8 rounded-full bg-[#10B981]/20 dark:bg-[#10B981]/30 flex items-center justify-center flex-shrink-0">
                  <Server className="h-5 w-5 text-[#10B981]" />
                </div>
              ) : sampling.recommendation.status === 'prepare-migration' ? (
                <div className="h-8 w-8 rounded-full bg-[#F59E0B]/20 dark:bg-[#FBBF24]/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-[#F59E0B] dark:text-[#FBBF24]" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-danger/20 dark:bg-danger/30 flex items-center justify-between flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-sm font-bold ${getStatusColor(sampling.recommendation.status)}`}>
                    {sampling.recommendation.status === 'free-ok' && '無料プランでOK'}
                    {sampling.recommendation.status === 'prepare-migration' && '移行準備を推奨'}
                    {sampling.recommendation.status === 'migrate-now' && '移行を強く推奨'}
                    {sampling.recommendation.status === 'critical' && '緊急：移行が必要'}
                  </h3>
                  <Badge variant={getStatusBadgeVariant(sampling.recommendation.status)}>
                    {sampling.recommendation.recommendedPlan}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-ink dark:text-gray-100 mb-2">
                  {sampling.recommendation.reason}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-sub dark:text-gray-400">現在のプラン: </span>
                    <span className="font-semibold text-neutral-ink dark:text-gray-100">
                      {sampling.recommendation.currentPlan}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-sub dark:text-gray-400">推定コスト: </span>
                    <span className="font-semibold text-neutral-ink dark:text-gray-100">
                      ${sampling.recommendation.estimatedCost}/月
                    </span>
                  </div>
                  {sampling.recommendation.daysUntilLimit !== null && (
                    <div className="col-span-2">
                      <span className="text-neutral-sub dark:text-gray-400">限界まで: </span>
                      <span className={`font-semibold ${
                        sampling.recommendation.daysUntilLimit < 30 ? 'text-danger' :
                        sampling.recommendation.daysUntilLimit < 60 ? 'text-[#F59E0B]' :
                        'text-[#10B981]'
                      }`}>
                        約{sampling.recommendation.daysUntilLimit}日
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* メトリクス詳細 */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 rounded border border-neutral-border dark:border-gray-700">
              <p className="text-xs text-neutral-sub dark:text-gray-400 mb-1">ピーク同時配信数</p>
              <p className="text-2xl font-bold text-neutral-ink dark:text-gray-100">
                {sampling.peak.concurrentStreams}
              </p>
              <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                推定ユーザー数: {sampling.peak.estimatedTotalUsers}人
              </p>
            </div>

            <div className="p-3 rounded border border-neutral-border dark:border-gray-700">
              <p className="text-xs text-neutral-sub dark:text-gray-400 mb-1">平均同時配信数（週）</p>
              <p className="text-2xl font-bold text-neutral-ink dark:text-gray-100">
                {sampling.weekly.avgActiveStreams.toFixed(1)}
              </p>
              <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                実行回数: {sampling.weekly.totalRuns}回
              </p>
            </div>

            <div className="p-3 rounded border border-neutral-border dark:border-gray-700">
              <p className="text-xs text-neutral-sub dark:text-gray-400 mb-1">平均同時配信数（月）</p>
              <p className="text-2xl font-bold text-neutral-ink dark:text-gray-100">
                {sampling.monthly.avgActiveStreams.toFixed(1)}
              </p>
              <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                実行回数: {sampling.monthly.totalRuns}回
              </p>
            </div>

            <div className="p-3 rounded border border-neutral-border dark:border-gray-700">
              <p className="text-xs text-neutral-sub dark:text-gray-400 mb-1">平均実行時間（月）</p>
              <p className="text-xl font-bold text-neutral-ink dark:text-gray-100">
                {(sampling.monthly.avgExecutionTime / 1000).toFixed(2)}秒
              </p>
              <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                最大: {(sampling.monthly.maxExecutionTime / 1000).toFixed(2)}秒
              </p>
            </div>

            <div className="p-3 rounded border border-neutral-border dark:border-gray-700">
              <p className="text-xs text-neutral-sub dark:text-gray-400 mb-1">エラー率（月）</p>
              <p className={`text-2xl font-bold ${
                sampling.monthly.errorRate >= 10 ? 'text-danger' :
                sampling.monthly.errorRate >= 5 ? 'text-[#F59E0B]' :
                'text-[#10B981]'
              }`}>
                {sampling.monthly.errorRate.toFixed(1)}%
              </p>
            </div>

            <div className="p-3 rounded border border-neutral-border dark:border-gray-700">
              <p className="text-xs text-neutral-sub dark:text-gray-400 mb-1">Function制限まで</p>
              <p className="text-xl font-bold text-neutral-ink dark:text-gray-100">
                {((300000 - sampling.monthly.maxExecutionTime) / 1000).toFixed(0)}秒
              </p>
              <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                （制限: 300秒）
              </p>
            </div>
          </div>

          {/* 判断基準の説明 */}
          <div className="p-3 rounded bg-neutral-bg dark:bg-gray-800 text-xs space-y-2">
            <p className="font-semibold text-neutral-ink dark:text-gray-100">判断基準:</p>
            <ul className="space-y-1 text-neutral-sub dark:text-gray-400 ml-4 list-disc">
              <li>
                <span className="font-semibold text-[#10B981]">無料プランでOK:</span> 平均同時配信数 6人以下（推定ユーザー数 ~72人）
              </li>
              <li>
                <span className="font-semibold text-[#F59E0B]">移行準備を推奨:</span> 平均同時配信数 6-8人（推定ユーザー数 72-96人）
              </li>
              <li>
                <span className="font-semibold text-danger">移行を強く推奨:</span> 平均同時配信数 8-10人（推定ユーザー数 96-120人）
              </li>
              <li>
                <span className="font-semibold text-danger">緊急:</span> ピーク同時配信数 200人以上、またはFunction実行時間が制限に近い
              </li>
            </ul>
            <p className="text-neutral-sub dark:text-gray-400 mt-2">
              ※ 推定ユーザー数は「平均配信時間120分」を前提に算出（同時配信率8.33%）
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 成長トレンドグラフ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">成長トレンド</CardTitle>
          <CardDescription className="text-xs">過去10日間の新規登録数</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={recentGrowth}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E2E8F0"} />
              <XAxis
                dataKey="date"
                stroke={isDark ? "#9ca3af" : "#475569"}
                style={{ fontSize: '11px' }}
                tick={{ fill: isDark ? '#d1d5db' : '#475569', fontSize: 11 }}
                tickFormatter={(value) => {
                  // YYYY-MM-DD を MM/DD に変換
                  const [, month, day] = value.split('-');
                  return `${month}/${day}`;
                }}
              />
              <YAxis
                stroke={isDark ? "#9ca3af" : "#475569"}
                style={{ fontSize: '11px' }}
                tick={{ fill: isDark ? '#d1d5db' : '#475569', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1f2937' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#374151' : '#E2E8F0'}`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: isDark ? '#f3f4f6' : '#0f172a'
                }}
                labelFormatter={(value) => `日付: ${value}`}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line
                type="monotone"
                dataKey="newUsers"
                stroke="#4F46E5"
                strokeWidth={2}
                name="新規登録"
                dot={{ fill: "#4F46E5", r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#10B981"
                strokeWidth={2}
                name="累計"
                dot={{ fill: "#10B981", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
