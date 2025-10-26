"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Loader2,
  AlertCircle,
  Calendar,
  TrendingUp,
  Eye,
  Play,
  CheckCircle,
  Radio,
  Users,
  BarChart3,
  Clock
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { requireClientAuth } from "@/lib/client-auth";
import Image from "next/image";

interface Stream {
  id: number;
  streamId: string;
  startedAt: string;
  estimatedEnd: string;
  duration: string;
  peakViewers: number;
  peakTime: string;
  estimatedWatchTime: string;
  platform: string;
  thumbnailUrl: string | null;
  isLive?: boolean;
  title?: string;
}

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "completed">("all");
  const [sortBy, setSortBy] = useState<"recent" | "viewers">("recent");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Next.jsのメタデータシステムとの競合を避けるため、少し遅延させる
    const timer = setTimeout(() => {
      document.title = "配信一覧 | CastCue";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function fetchStreams() {
      try {
        setLoading(true);
        setError(null);

        // 認証チェック（Supabaseセッションまたはカスタムセッション）
        const authStatus = await requireClientAuth(router);
        if (!authStatus) {
          return; // リダイレクト処理はrequireClientAuthが行う
        }

        // 配信一覧を取得
        const response = await fetch("/api/streams");

        if (!response.ok) {
          throw new Error("Failed to fetch streams");
        }

        const data = await response.json();
        setStreams(data.streams || []);
      } catch (err: any) {
        console.error("Error fetching streams:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStreams();
  }, [supabase, router]);

  // Filter and Sort Logic
  useEffect(() => {
    let result = [...streams];

    // Apply filter
    if (filter === "live") {
      result = result.filter((s) => s.isLive);
    } else if (filter === "completed") {
      result = result.filter((s) => !s.isLive);
    }

    // Apply sort
    if (sortBy === "recent") {
      result.sort((a, b) => {
        const aDate = new Date(a.startedAt).getTime();
        const bDate = new Date(b.startedAt).getTime();
        return bDate - aDate; // 新しい順（降順）
      });
    } else if (sortBy === "viewers") {
      result.sort((a, b) => b.peakViewers - a.peakViewers);
    }

    setFilteredStreams(result);
  }, [streams, filter, sortBy]);


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
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-ink dark:text-gray-100 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              配信一覧
            </h1>
            <p className="text-neutral-sub dark:text-gray-400 mt-1">配信の統計とパフォーマンスを一目で確認</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {filteredStreams.length} / {streams.length} 配信
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Sort Controls */}
        {streams.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Filter Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-sub dark:text-gray-400 mr-2">
                    フィルター:
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant={filter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("all")}
                      className="gap-2"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      すべて
                    </Button>
                    <Button
                      variant={filter === "live" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("live")}
                      className="gap-2"
                    >
                      <Play className="h-3.5 w-3.5" />
                      配信中
                    </Button>
                    <Button
                      variant={filter === "completed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("completed")}
                      className="gap-2"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      終了済み
                    </Button>
                  </div>
                </div>

                {/* Sort Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-sub dark:text-gray-400 mr-2">
                    並び替え:
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant={sortBy === "recent" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("recent")}
                      className="gap-2"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      新しい順
                    </Button>
                    <Button
                      variant={sortBy === "viewers" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("viewers")}
                      className="gap-2"
                    >
                      <Users className="h-3.5 w-3.5" />
                      視聴者数
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stream Cards Grid */}
      {filteredStreams.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredStreams.map((stream) => (
            <Card
              key={stream.id}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 hover:border-primary/50"
            >
              {/* Thumbnail Section */}
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/5 to-success/5">
                {stream.thumbnailUrl ? (
                  <Image
                    src={stream.thumbnailUrl}
                    alt={stream.title || "配信サムネイル"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-16 w-16 text-neutral-border" />
                  </div>
                )}

                {/* Live/Completed Badge */}
                <div className="absolute top-3 right-3">
                  {stream.isLive ? (
                    <div className="px-3 py-1.5 bg-danger/90 backdrop-blur-sm rounded-full flex items-center gap-1.5 animate-pulse">
                      <Radio className="h-3.5 w-3.5 text-white" />
                      <span className="text-xs font-bold text-white uppercase tracking-wide">
                        Live
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 bg-success/90 backdrop-blur-sm rounded-full flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                      <span className="text-xs font-bold text-white uppercase tracking-wide">
                        終了
                      </span>
                    </div>
                  )}
                </div>

                {/* Platform Badge */}
                <div className="absolute top-3 left-3">
                  <div className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      {stream.platform}
                    </span>
                  </div>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Title */}
                {stream.title && (
                  <h3 className="font-semibold text-neutral-ink dark:text-gray-100 line-clamp-2 leading-snug">
                    {stream.title}
                  </h3>
                )}

                {/* Time Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-neutral-sub dark:text-gray-400">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium">{stream.startedAt}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-sub dark:text-gray-400">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>配信時間: <span className="font-medium text-neutral-ink dark:text-gray-100">{stream.duration}</span></span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-border dark:border-gray-700">
                  {/* Peak Viewers */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-sub dark:text-gray-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>ピーク同接</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {stream.peakViewers}
                    </p>
                    <p className="text-xs text-neutral-sub dark:text-gray-400">
                      {stream.peakTime}
                    </p>
                  </div>

                  {/* Watch Time */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-sub dark:text-gray-400">
                      <Eye className="h-3.5 w-3.5" />
                      <span>視聴時間</span>
                    </div>
                    <p className="text-xl font-bold text-success">
                      {stream.estimatedWatchTime}
                    </p>
                    <p className="text-xs text-neutral-sub dark:text-gray-400">
                      概算
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => router.push(`/streams/${stream.id}`)}
                >
                  <span>詳細を見る</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="border-2 border-dashed">
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
                {streams.length === 0 ? (
                  <Radio className="h-10 w-10 text-primary" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-neutral-sub dark:text-gray-400" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-neutral-ink dark:text-gray-100">
                  {streams.length === 0
                    ? "配信データがまだありません"
                    : "該当する配信が見つかりません"}
                </h3>
                <p className="text-neutral-sub dark:text-gray-400">
                  {streams.length === 0
                    ? "Twitchで配信を開始すると、ここに配信の統計情報が表示されます"
                    : "フィルター条件を変更してもう一度お試しください"}
                </p>
              </div>
              <div className="pt-4">
                {streams.length === 0 ? (
                  <Button className="gap-2">
                    <Play className="h-4 w-4" />
                    配信を開始
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setFilter("all");
                      setSortBy("recent");
                    }}
                  >
                    <Radio className="h-4 w-4" />
                    フィルターをリセット
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
