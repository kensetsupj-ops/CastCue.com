"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTutorial, TutorialStep } from "@/contexts/TutorialContext";

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialOverlay() {
  const { state, nextStep, previousStep, skipTutorial, getCurrentStepData, hideOverlay } = useTutorial();
  const [spotlightPosition, setSpotlightPosition] = useState<SpotlightPosition | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const stepData = getCurrentStepData();

  // スポットライトの位置を計算
  useEffect(() => {
    if (!state.isActive || !state.targetElement) {
      setSpotlightPosition(null);
      return;
    }

    const updatePosition = () => {
      try {
        const target = document.querySelector(state.targetElement!);
        if (target) {
          const rect = target.getBoundingClientRect();
          setSpotlightPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
        } else {
          // 要素が見つからない場合はnullにして非表示
          setSpotlightPosition(null);
        }
      } catch (error) {
        console.error("[TutorialOverlay] Failed to calculate spotlight position:", error);
        setSpotlightPosition(null);
      }
    };

    // 初回計算
    updatePosition();

    // リサイズ・スクロール時に再計算
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    // MutationObserver でDOM変更を監視
    const observer = new MutationObserver(updatePosition);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [state.isActive, state.targetElement]);

  // ESCキーでスキップ確認
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.isActive) {
        setShowSkipConfirm(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isActive]);

  const handleSkipConfirm = () => {
    skipTutorial();
    setShowSkipConfirm(false);
  };

  const handleSkipCancel = () => {
    setShowSkipConfirm(false);
  };

  if (!state.isActive || !stepData || state.isOverlayHidden) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] pointer-events-none transition-opacity duration-300"
    >
      {/* Spotlight */}
      {spotlightPosition && (
        <div
          className="absolute rounded-lg transition-all duration-400 ease-out animate-pulse"
          style={{
            top: spotlightPosition.top - 8,
            left: spotlightPosition.left - 8,
            width: spotlightPosition.width + 16,
            height: spotlightPosition.height + 16,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            pointerEvents: "none",
            zIndex: 10000,
          }}
        />
      )}

      {/* Tooltip */}
      {!showSkipConfirm && (
        <div
          className="fixed z-[10001] w-[400px] max-w-[90vw] pointer-events-auto"
          style={{
            top: spotlightPosition
              ? Math.min(
                  spotlightPosition.top + spotlightPosition.height + 24,
                  window.innerHeight - 300
                )
              : "50%",
            left: spotlightPosition
              ? Math.max(
                  Math.min(
                    spotlightPosition.left + spotlightPosition.width / 2 - 200,
                    window.innerWidth - 420
                  ),
                  20
                )
              : "50%",
            transform: spotlightPosition ? "none" : "translate(-50%, -50%)",
          }}
        >
          <Card className="shadow-2xl border-primary">
            <CardContent className="p-6">
              {/* Step Indicator and Skip Button */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-primary">
                  ステップ {state.currentStep} / {5}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSkipConfirm(true)}
                  className="h-auto p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Indicator */}
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      step <= state.currentStep ? "bg-primary" : "bg-neutral-border dark:bg-gray-700"
                    }`}
                  />
                ))}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-neutral-ink dark:text-gray-100 mb-2">
                {stepData.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-neutral-sub dark:text-gray-400 mb-4">
                {stepData.description}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // "click_and_wait" アクションの場合はオーバーレイを隠す
                    // それ以外は次のステップに進む
                    if (stepData.action === "click_and_wait") {
                      hideOverlay();
                    } else {
                      nextStep();
                    }
                  }}
                  className="flex-1"
                >
                  {stepData.buttonText}
                </Button>
                {state.currentStep > 1 && (
                  <Button variant="outline" onClick={previousStep}>
                    戻る
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Skip Confirmation Dialog */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center pointer-events-auto">
          <Card className="w-[450px] max-w-[90vw] border-danger">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-neutral-ink dark:text-gray-100 mb-2">
                チュートリアルを終了しますか？
              </h3>
              <p className="text-sm text-neutral-sub dark:text-gray-400 mb-4">
                {stepData.skipConfirm ||
                  "後からでも設定は可能ですが、最初に完了することをおすすめします。"}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleSkipConfirm}
                  className="flex-1 bg-danger hover:bg-danger/90"
                >
                  終了する
                </Button>
                <Button variant="outline" onClick={handleSkipCancel} className="flex-1">
                  続ける
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
