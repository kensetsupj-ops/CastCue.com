import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <FileQuestion className="h-6 w-6 text-warning" />
          </div>
          <CardTitle className="text-h2">404 - ページが見つかりません</CardTitle>
          <CardDescription className="text-body mt-2">
            お探しのページは存在しないか、移動された可能性があります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/dashboard">ダッシュボードに戻る</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">ログインページへ</Link>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-caption text-neutral-sub">
              URLが正しいかご確認ください。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
