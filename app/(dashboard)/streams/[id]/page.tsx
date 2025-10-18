"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Clock,
  Calendar,
  Share2,
  Download,
  BarChart3,
  Activity,
  Radio,
  CheckCircle,
  AlertCircle,
  Star,
  Heart,
  MessageCircle,
  Repeat,
  Zap,
  Sparkles,
  ExternalLink,
  Play,
  Timer,
  Lock,
  Gamepad2,
  FileEdit
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { useTheme } from "@/lib/theme-provider";
import Image from "next/image";

// チャートデータ型
interface ChartData {
  time: string;
  viewers: number;
  clicks?: number;
}

// イベント型
interface StreamEvent {
  time: string;
  type: "peak" | "raid" | "host" | "milestone" | "post" | "start";
  title: string;
  description: string;
  impact?: number;
}

// 詳細統計型
interface DetailedStats {
  averageViewers: number;
  peakViewers: number;
  peakTime: string;
  newFollowers: number;
  clips: number;
  engagement: number;
  gameName?: string;
  gameId?: string;
  newSubscribers?: number;
  totalRaids?: number;
  totalRaidViewers?: number;
  bitsCheered?: number;
}

// ソーシャルメトリクス型
interface SocialMetrics {
  platform: "X";  // 現在はXのみ実装
  posts: number;
  impressions: number;
  engagements: number;
  clicks: number;
  conversionRate: number;
}

// 投稿情報型
interface PostInfo {
  id: string;
  createdAt: string;
  templateName: string;
  bodyText: string;
  status: string;
  channel: string;
}

export default function StreamDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamData, setStreamData] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [socialMetrics, setSocialMetrics] = useState<SocialMetrics[]>([]);
  const [postTime, setPostTime] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [postInfo, setPostInfo] = useState<PostInfo[] | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const streamId = params?.id as string;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const timer = setTimeout(() => {
      document.title = "配信詳細 | CastCue";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchStreamDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  // データロード完了後もタイトルを設定
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        document.title = "配信詳細 | CastCue";
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  async function fetchStreamDetails() {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/streams/${streamId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch stream details");
      }

      const data = await response.json();
      setStreamData(data.stream);
      setChartData(data.chartData && data.chartData.length > 0 ? data.chartData : generateMockChartData());
      setEvents(data.events && data.events.length > 0 ? data.events : generateMockEvents());
      setStats(data.stats || generateMockStats());
      setSocialMetrics(data.socialMetrics && data.socialMetrics.length > 0 ? data.socialMetrics : generateMockSocialMetrics());
      setPostTime(data.postTime || null);
      setPostInfo(data.postInfo || null);
    } catch (err: any) {
      console.error("Error fetching stream details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // モックデータ生成関数
  function generateMockChartData(): ChartData[] {
    const data: ChartData[] = [];
    const hours = 4;
    const pointsPerHour = 12;
    let baseViewers = 150;

    for (let i = 0; i <= hours * pointsPerHour; i++) {
      const time = new Date(Date.now() - (hours * pointsPerHour - i) * 5 * 60000);
      const variation = Math.sin(i / 6) * 50 + Math.random() * 30;
      baseViewers = Math.max(50, Math.min(500, baseViewers + variation));

      data.push({
        time: time.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
        viewers: Math.round(baseViewers)
      });
    }
    return data;
  }

  function generateMockEvents(): StreamEvent[] {
    return [
      {
        time: "14:00",
        type: "start",
        title: "配信開始",
        description: "配信を開始しました"
      },
      {
        time: "14:30",
        type: "post",
        title: "X投稿完了",
        description: "配信開始を自動投稿",
        impact: 45
      },
      {
        time: "15:15",
        type: "peak",
        title: "視聴者数ピーク",
        description: "485人が同時視聴",
        impact: 100
      },
      {
        time: "15:45",
        type: "raid",
        title: "レイド受信",
        description: "streamer123から120人",
        impact: 120
      }
    ];
  }

  function generateMockStats(): DetailedStats {
    return {
      averageViewers: 287,
      peakViewers: 485,
      peakTime: "15:15",
      newFollowers: 67,
      clips: 12,
      engagement: 78,
      gameName: "Apex Legends"
    };
  }

  function generateMockSocialMetrics(): SocialMetrics[] {
    return [
      {
        platform: "X",
        posts: 1,
        impressions: 12480,
        engagements: 892,
        clicks: 245,
        conversionRate: 19.6
      }
    ];
  }

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `配信詳細: ${streamData?.title || "配信"} - CastCue`;

    try {
      // Web Share APIが利用可能な場合
      if (navigator.share) {
        await navigator.share({
          title: shareText,
          url: shareUrl,
        });
      } else {
        // フォールバック: クリップボードにコピー
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err: any) {
      // ユーザーがキャンセルした場合やエラーの場合
      if (err.name !== "AbortError") {
        console.error("共有エラー:", err);
        // クリップボードへのコピーを試みる
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        } catch (clipboardErr) {
          console.error("クリップボードコピーエラー:", clipboardErr);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-transparent to-success/5 dark:from-primary/10 dark:to-success/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
              <Activity className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-lg font-medium text-neutral-ink dark:text-gray-100">配信データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-danger mx-auto" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-neutral-ink dark:text-gray-100">データの読み込みに失敗しました</p>
              <p className="text-sm text-neutral-sub dark:text-gray-400">{error}</p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={() => router.back()} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                戻る
              </Button>
              <Button onClick={fetchStreamDetails}>再試行</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-transparent to-success/5 dark:from-primary/10 dark:to-success/10">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ヘッダーナビゲーション */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            配信一覧に戻る
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleShare}
          >
            {shareSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="hidden sm:inline">URLをコピーしました</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">共有</span>
              </>
            )}
          </Button>
        </div>

        {/* ヒーローセクション */}
        <Card className="overflow-hidden shadow-xl border-0">
          <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/20 via-primary/10 to-success/10">
            {streamData?.thumbnailUrl ? (
              <Image
                src={streamData.thumbnailUrl}
                alt={streamData.title || "配信サムネイル"}
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-sub/10">
                <Play className="h-16 w-16 text-neutral-sub/30" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            {/* ステータスバッジ */}
            <div className="absolute top-4 right-4">
              {streamData?.isLive ? (
                <Badge className="bg-danger text-white border-0 gap-1.5 px-3 py-1.5 animate-pulse shadow-lg">
                  <Radio className="h-3.5 w-3.5" />
                  LIVE
                </Badge>
              ) : (
                <Badge className="bg-white/90 text-neutral-ink border-0 gap-1.5 px-3 py-1.5 shadow-lg">
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  配信終了
                </Badge>
              )}
            </div>

            {/* 配信情報オーバーレイ */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold line-clamp-2 drop-shadow-lg">
                  {streamData?.title || "配信タイトル"}
                </h1>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-white/90">
                  <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{streamData?.startedAt || "2024/01/15 14:00"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{streamData?.duration || "3h 30m"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">ピーク {stats?.peakViewers || "-"}人</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 主要メトリクス */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* 平均視聴者数 */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl group-hover:bg-primary/15 dark:group-hover:bg-primary/25 transition-colors">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-neutral-sub dark:text-gray-400 font-medium">平均視聴者数</p>
                <p className="text-3xl font-bold text-neutral-ink dark:text-gray-100">
                  {stats?.averageViewers?.toLocaleString() || "-"}
                  <span className="text-base font-normal text-neutral-sub dark:text-gray-400 ml-1">人</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 新規フォロワー */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-neutral-sub/5 dark:bg-gray-700/20" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-info/10 dark:bg-info/20 rounded-xl opacity-50">
                  <Heart className="h-5 w-5 text-info" />
                </div>
                <Badge className="bg-neutral-ink dark:bg-gray-700 text-white text-xs h-5 gap-1">
                  <Lock className="h-3 w-3" />
                  Soon
                </Badge>
              </div>

              <div className="space-y-1 opacity-50">
                <p className="text-sm text-neutral-sub dark:text-gray-400 font-medium">新規フォロワー</p>
                <p className="text-3xl font-bold text-neutral-ink dark:text-gray-100">-</p>
                <p className="text-xs text-neutral-sub/70 dark:text-gray-500">OAuth実装後に利用可能</p>
              </div>
            </CardContent>
          </Card>

          {/* エンゲージメント率 */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-warning/10 dark:bg-warning/20 rounded-xl group-hover:bg-warning/15 dark:group-hover:bg-warning/25 transition-colors">
                  <Activity className="h-5 w-5 text-warning" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-neutral-sub dark:text-gray-400 font-medium">エンゲージメント</p>
                <p className="text-3xl font-bold text-neutral-ink dark:text-gray-100">
                  {stats?.engagement || 0}
                  <span className="text-base font-normal text-neutral-sub dark:text-gray-400 ml-1">%</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* メインコンテンツグリッド */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* 左カラム - グラフとソーシャル */}
          <div className="xl:col-span-2 space-y-6">

            {/* 視聴者数推移グラフ */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">視聴者数推移</CardTitle>
                    <p className="text-xs text-neutral-sub dark:text-gray-400 mt-0.5">10分毎のサンプリングデータ</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E2E8F0"} />
                    <XAxis
                      dataKey="time"
                      stroke={isDark ? "#9ca3af" : "#64748b"}
                      style={{ fontSize: '12px' }}
                      tick={{ fill: isDark ? '#d1d5db' : '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke={isDark ? "#818cf8" : "#4F46E5"}
                      style={{ fontSize: '12px' }}
                      width={45}
                      tick={{ fill: isDark ? '#a5b4fc' : '#4F46E5', fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                        return value.toString();
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke={isDark ? "#34d399" : "#10B981"}
                      style={{ fontSize: '12px' }}
                      width={40}
                      tick={{ fill: isDark ? '#6ee7b7' : '#10B981', fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                        return value.toString();
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        padding: '8px 12px',
                        color: isDark ? '#f3f4f6' : '#0f172a'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: isDark ? '#d1d5db' : '#64748b' }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="viewers"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      name="視聴者数"
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      name="クリック数"
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    {postTime && (
                      <ReferenceLine
                        x={postTime}
                        stroke={isDark ? "#fbbf24" : "#F59E0B"}
                        strokeDasharray="3 3"
                        strokeWidth={2}
                        label={{
                          value: 'X投稿',
                          position: 'top',
                          fill: isDark ? '#fbbf24' : '#F59E0B',
                          fontSize: 11,
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>

                {/* グラフ統計 */}
                <div className="my-6 border-t border-neutral-border dark:border-gray-700" />

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-sub dark:text-gray-400">ピーク視聴者</p>
                    <p className="text-2xl font-bold text-primary">
                      {stats?.peakViewers?.toLocaleString() || "-"}
                    </p>
                    <p className="text-xs text-neutral-sub/70 dark:text-gray-500">{stats?.peakTime}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-neutral-sub dark:text-gray-400">クリップ作成</p>
                    <p className="text-2xl font-bold text-success">
                      {stats?.clips || 0}
                    </p>
                    <p className="text-xs text-neutral-sub/70 dark:text-gray-500">配信中に作成</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-neutral-sub dark:text-gray-400">ゲームカテゴリ</p>
                    <p className="text-base font-bold text-info truncate" title={stats?.gameName}>
                      {stats?.gameName || "未設定"}
                    </p>
                    <div className="flex items-center gap-1">
                      <Gamepad2 className="h-3 w-3 text-neutral-sub/70 dark:text-gray-500" />
                      <p className="text-xs text-neutral-sub/70 dark:text-gray-500">Twitch API</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ソーシャルメディア効果 */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 dark:bg-success/20 rounded-lg">
                    <Share2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">ソーシャルメディア効果</CardTitle>
                    <p className="text-xs text-neutral-sub dark:text-gray-400 mt-0.5">投稿パフォーマンス分析</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {socialMetrics.map((metric, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-gradient-to-r from-neutral-sub/5 to-transparent dark:from-gray-700/20 border border-neutral-border/50 dark:border-gray-700 hover:border-neutral-border dark:hover:border-gray-600 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-black/10 dark:bg-white/10">
                          <span className="font-bold text-black dark:text-white text-lg">𝕏</span>
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-ink dark:text-gray-100">X（旧Twitter）</p>
                          <p className="text-xs text-neutral-sub dark:text-gray-400">{metric.posts}件の投稿</p>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                        詳細
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-neutral-sub dark:text-gray-400">インプレ</p>
                        <p className="text-lg font-bold text-neutral-ink dark:text-gray-100">
                          {(metric.impressions / 1000).toFixed(1)}K
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-neutral-sub dark:text-gray-400">エンゲージ</p>
                        <p className="text-lg font-bold text-neutral-ink dark:text-gray-100">
                          {metric.engagements.toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-neutral-sub dark:text-gray-400">クリック</p>
                        <p className="text-lg font-bold text-neutral-ink dark:text-gray-100">
                          {metric.clicks}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-neutral-sub dark:text-gray-400">CTR</p>
                        <p className="text-lg font-bold text-neutral-ink dark:text-gray-100">
                          {metric.conversionRate}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-border/30 dark:border-gray-700/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-sub dark:text-gray-400">コンバージョン率</span>
                        <div className="flex items-center gap-3">
                          <Progress value={metric.conversionRate} className="w-24 h-1.5" />
                          <span className="text-sm font-semibold text-neutral-ink dark:text-gray-100 min-w-[3rem] text-right">
                            {metric.conversionRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 総合効果 */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-success/5 to-transparent dark:from-primary/20 dark:via-success/10 border border-primary/20 dark:border-primary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-neutral-ink dark:text-gray-100">総合ソーシャル効果</p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mt-0.5">全プラットフォーム合計</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">+245</p>
                      <p className="text-xs text-neutral-sub dark:text-gray-400">新規視聴者</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 投稿情報 */}
            {postInfo && postInfo.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-info/10 dark:bg-info/20 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">投稿情報</CardTitle>
                      <p className="text-xs text-neutral-sub dark:text-gray-400 mt-0.5">この配信で投稿された内容</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {postInfo.map((post, index) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl bg-gradient-to-r from-neutral-sub/5 to-transparent dark:from-gray-700/20 border border-neutral-border/50 dark:border-gray-700"
                    >
                      {/* ヘッダー：テンプレート名と投稿時刻 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-info/10 dark:bg-info/20">
                            <FileEdit className="h-4 w-4 text-info" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100">
                              {post.templateName}
                            </p>
                            <p className="text-xs text-neutral-sub dark:text-gray-400">
                              投稿日時: {post.createdAt}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-success/10 dark:bg-success/20 text-success border-success/20">
                          送信済
                        </Badge>
                      </div>

                      {/* 投稿本文 */}
                      <div className="mt-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-neutral-border/30 dark:border-gray-600/30">
                        <p className="text-xs text-neutral-sub dark:text-gray-400 mb-1.5 font-medium">投稿内容</p>
                        <p className="text-sm text-neutral-ink dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                          {post.bodyText}
                        </p>
                      </div>

                      {/* プラットフォーム */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-neutral-sub dark:text-gray-400">投稿先:</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5">
                          <span className="font-bold text-black dark:text-white text-sm">𝕏</span>
                          <span className="text-xs text-neutral-ink dark:text-gray-100">X (旧Twitter)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右カラム - タイムラインとスコア */}
          <div className="space-y-6">

            {/* タイムライン */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-info/10 dark:bg-info/20 rounded-lg">
                    <Timer className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">配信タイムライン</CardTitle>
                    <p className="text-xs text-neutral-sub dark:text-gray-400 mt-0.5">重要イベントの記録</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                {/* タイムラインライン */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-success to-info opacity-30" />

                {/* イベント */}
                <div className="space-y-3">
                  {events.map((event, index) => (
                    <div key={index} className="flex gap-4 group">
                      <div className="relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${
                          event.type === "start" ? "bg-neutral-ink dark:bg-gray-700 text-white" :
                          event.type === "peak" ? "bg-primary text-white" :
                          event.type === "post" ? "bg-info text-white" :
                          "bg-warning text-white"
                        }`}>
                          {event.type === "start" && <Play className="h-3.5 w-3.5" />}
                          {event.type === "peak" && <TrendingUp className="h-3.5 w-3.5" />}
                          {event.type === "post" && <MessageCircle className="h-3.5 w-3.5" />}
                        </div>
                      </div>

                      <div className="flex-1 pb-3">
                        <div className="p-3 rounded-lg bg-white/50 dark:bg-gray-700/50 border border-neutral-border/50 dark:border-gray-600/50 group-hover:border-neutral-border dark:group-hover:border-gray-600 group-hover:shadow-md transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <h4 className="font-semibold text-sm text-neutral-ink dark:text-gray-100">{event.title}</h4>
                              <p className="text-xs text-neutral-sub dark:text-gray-400">{event.description}</p>
                            </div>
                            <span className="text-xs text-neutral-sub dark:text-gray-400 whitespace-nowrap">{event.time}</span>
                          </div>

                          {event.impact && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3 text-warning" />
                              <span className="text-xs font-medium text-warning">
                                +{event.impact}人
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 詳細統計 */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 dark:bg-warning/20 rounded-lg">
                    <Star className="h-5 w-5 text-warning" />
                  </div>
                  <CardTitle className="text-lg">詳細統計</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {/* クリップ */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-neutral-sub/5 to-transparent dark:from-gray-700/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-neutral-sub dark:text-gray-400" />
                      <span className="text-sm text-neutral-sub dark:text-gray-400">クリップ作成</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-neutral-ink dark:text-gray-100">{stats?.clips || 0}</span>
                    </div>
                  </div>
                </div>

                {/* サブスク（未実装） */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-neutral-sub/5 to-transparent dark:from-gray-700/20 opacity-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-neutral-sub dark:text-gray-400" />
                      <span className="text-sm text-neutral-sub dark:text-gray-400">新規サブスク</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-neutral-ink dark:text-gray-100">-</span>
                      <Badge className="bg-neutral-ink dark:bg-gray-700 text-white text-xs h-5">Soon</Badge>
                    </div>
                  </div>
                </div>

                {/* ビッツ（未実装） */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-neutral-sub/5 to-transparent dark:from-gray-700/20 opacity-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-neutral-sub dark:text-gray-400" />
                      <span className="text-sm text-neutral-sub dark:text-gray-400">ビッツチア</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-neutral-ink dark:text-gray-100">-</span>
                      <Badge className="bg-neutral-ink dark:bg-gray-700 text-white text-xs h-5">Soon</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* パフォーマンススコア */}
            <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-success/5 dark:from-primary/10 dark:to-success/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/15 dark:bg-primary/25 rounded-lg">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg dark:text-gray-100">パフォーマンススコア</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                {/* スコアサークル */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-neutral-border/30 dark:text-gray-600/30"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - 0.82)}`}
                      className="text-primary transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">82</p>
                      <p className="text-xs text-neutral-sub dark:text-gray-400">/ 100</p>
                    </div>
                  </div>
                </div>

                {/* 評価項目 */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-sub dark:text-gray-400">視聴者獲得</span>
                      <span className="font-semibold text-neutral-ink dark:text-gray-100">90</span>
                    </div>
                    <Progress value={90} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-sub dark:text-gray-400">エンゲージメント</span>
                      <span className="font-semibold text-neutral-ink dark:text-gray-100">78</span>
                    </div>
                    <Progress value={78} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-sub dark:text-gray-400">成長率</span>
                      <span className="font-semibold text-neutral-ink dark:text-gray-100">85</span>
                    </div>
                    <Progress value={85} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-sub dark:text-gray-400">ソーシャル効果</span>
                      <span className="font-semibold text-neutral-ink dark:text-gray-100">75</span>
                    </div>
                    <Progress value={75} className="h-1.5" />
                  </div>
                </div>

                {/* 評価メッセージ */}
                <div className="mt-4 p-3 rounded-lg bg-success/10 dark:bg-success/20 border border-success/20 dark:border-success/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="text-sm font-medium text-success">優秀な配信でした！</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}