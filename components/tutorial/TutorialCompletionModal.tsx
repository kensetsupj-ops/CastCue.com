"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";
import { useRouter } from "next/navigation";

export function TutorialCompletionModal() {
  const { state } = useTutorial();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // ステップ5でチュートリアルが非アクティブ（完了直後）の場合に表示
    if (state.currentStep === 5 && !state.isActive && state.isCompleted) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [state]);

  const handleComplete = () => {
    setShow(false);
    router.push("/dashboard");
  };

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-[500px] max-w-[90vw]">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 dark:bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-ink dark:text-gray-100 mb-2">
              初期設定が完了しました
            </h2>
            <p className="text-sm text-neutral-sub dark:text-gray-400">
              これで配信開始時に自動でXに投稿されます。
              配信を開始すると、ブラウザ通知が届きます。
            </p>
          </div>

          <div className="space-y-3 mb-6 text-left">
            <div className="flex items-start gap-3 p-3 bg-neutral-bg dark:bg-gray-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100">
                  X連携完了
                </p>
                <p className="text-xs text-neutral-sub dark:text-gray-400">
                  自動投稿が有効になりました
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-neutral-bg dark:bg-gray-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100">
                  プッシュ通知有効
                </p>
                <p className="text-xs text-neutral-sub dark:text-gray-400">
                  配信開始時に通知が届きます
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-neutral-bg dark:bg-gray-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-neutral-ink dark:text-gray-100">
                  テンプレート作成済み
                </p>
                <p className="text-xs text-neutral-sub dark:text-gray-400">
                  デフォルトテンプレートが設定されました
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleComplete} className="w-full">
            ダッシュボードを見る
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
