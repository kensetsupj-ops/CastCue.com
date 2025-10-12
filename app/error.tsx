"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
            <AlertCircle className="h-6 w-6 text-danger" />
          </div>
          <CardTitle className="text-h2">エラーが発生しました</CardTitle>
          <CardDescription className="text-body mt-2">
            申し訳ございません。予期しないエラーが発生しました。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-neutral-bg border border-neutral-border p-3">
              <p className="text-caption font-mono text-danger break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-caption text-neutral-sub mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={reset} className="w-full">
              再試行
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full"
            >
              ダッシュボードに戻る
            </Button>
          </div>

          <div className="text-center">
            <p className="text-caption text-neutral-sub">
              問題が解決しない場合は、サポートにお問い合わせください。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
