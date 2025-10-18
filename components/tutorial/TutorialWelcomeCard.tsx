"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTutorial } from "@/contexts/TutorialContext";

export function TutorialWelcomeCard() {
  const { state, startTutorial, skipTutorial } = useTutorial();

  // ステップ0でチュートリアルが非アクティブの場合にのみ表示
  if (state.currentStep !== 0 || state.isActive || state.isCompleted) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary dark:border-primary/50 bg-primary/5 dark:bg-primary/10">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-neutral-ink dark:text-gray-100 mb-2">
              CastCueへようこそ
            </h2>
            <p className="text-sm text-neutral-sub dark:text-gray-400 mb-4">
              配信開始を自動でXに投稿し、効果を測定するシステムです。
              まず、以下の設定を完了させてください。
            </p>
            <div className="flex gap-2">
              <Button onClick={startTutorial}>初期設定を開始</Button>
              <Button variant="outline" onClick={skipTutorial}>
                後で設定する
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
