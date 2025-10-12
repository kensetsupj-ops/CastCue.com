"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
}

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchStreams() {
      try {
        setLoading(true);
        setError(null);

        // 認証チェック
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
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
      <div>
        <h1 className="text-3xl font-bold text-neutral-ink">配信一覧</h1>
        <p className="text-neutral-sub">配信（番組）単位の俯瞰と推移確認</p>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>配信履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-sub">開始</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-sub">推定終了</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-sub">配信時間</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-neutral-sub">ピーク同接</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-sub">ピーク到達時間</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-neutral-sub">視聴時間概算</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-sub">詳細</th>
                </tr>
              </thead>
              <tbody>
                {streams.map((stream) => (
                  <tr key={stream.id} className="border-b border-neutral-border hover:bg-neutral-bg transition-colors">
                    <td className="py-3 px-4 text-sm text-neutral-ink">{stream.startedAt}</td>
                    <td className="py-3 px-4 text-sm text-neutral-ink">{stream.estimatedEnd}</td>
                    <td className="py-3 px-4 text-sm text-neutral-ink">{stream.duration}</td>
                    <td className="py-3 px-4 text-sm text-neutral-ink font-medium text-right">{stream.peakViewers}</td>
                    <td className="py-3 px-4 text-sm text-neutral-ink">{stream.peakTime}</td>
                    <td className="py-3 px-4 text-sm text-neutral-ink text-right">{stream.estimatedWatchTime}</td>
                    <td className="py-3 px-4 text-sm">
                      <Button variant="ghost" size="sm">
                        詳細を見る
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty state when no streams */}
      {streams.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-sub">配信データがまだありません</p>
            <p className="text-sm text-neutral-sub mt-2">Twitchで配信を開始すると、ここに表示されます</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
