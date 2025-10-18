"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

// チュートリアルステップの定義
export interface TutorialStep {
  step: number;
  title: string;
  description: string;
  buttonText: string;
  targetElement: string | null;
  targetPage: string;
  action: "click_and_wait" | "guide" | "start";
  skipConfirm?: string;
}

// チュートリアルステップ定義
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    step: 0,
    title: "CastCueへようこそ",
    description: "配信開始を自動でXに投稿し、効果を測定するシステムです。",
    buttonText: "初期設定を開始",
    targetElement: null,
    targetPage: "/dashboard",
    action: "start",
  },
  {
    step: 1,
    title: "X（Twitter）アカウントを連携",
    description: "下のボタンをクリックしてXアカウントを連携してください。認証画面が表示されたら、アプリを承認してください。",
    buttonText: "理解しました",
    targetElement: "[data-tutorial-target='x-connect-button']",
    targetPage: "/integrations",
    action: "click_and_wait",
    skipConfirm: "X連携をスキップすると、自動投稿機能が使用できません。本当にスキップしますか？",
  },
  {
    step: 2,
    title: "プッシュ通知を有効化",
    description: "下のボタンをクリックしてブラウザ通知を有効化してください。配信開始時に通知が届き、投稿方法を選択できます。",
    buttonText: "理解しました",
    targetElement: "[data-tutorial-target='push-enable-button']",
    targetPage: "/integrations",
    action: "click_and_wait",
    skipConfirm: "通知を無効にすると、配信開始を見逃す可能性があります。本当にスキップしますか？",
  },
  {
    step: 3,
    title: "投稿テンプレートを作成",
    description: "下のボタンをクリックして投稿テンプレートを作成してください。プレースホルダー「{配信タイトル}」を挿入すると、実際の配信タイトルに自動置換されます。",
    buttonText: "理解しました",
    targetElement: "[data-tutorial-target='create-template-button']",
    targetPage: "/templates",
    action: "guide",
  },
  {
    step: 4,
    title: "デフォルトテンプレートに設定",
    description: "テンプレート保存後、確認ダイアログで「デフォルトに設定」をクリックしてください。自動投稿時にこのテンプレートが使用されます。",
    buttonText: "理解しました",
    targetElement: "[data-tutorial-target='set-default-confirm']",
    targetPage: "/templates",
    action: "click_and_wait",
  },
];

// チュートリアル状態
interface TutorialState {
  isActive: boolean;
  currentStep: number;
  isCompleted: boolean;
  targetElement: string | null;
  targetPage: string;
  isOverlayHidden: boolean; // オーバーレイを一時的に非表示にするフラグ
}

// Context の型定義
interface TutorialContextValue {
  state: TutorialState;
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  getCurrentStepData: () => TutorialStep | null;
  hideOverlay: () => void; // オーバーレイを一時的に隠す
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

// LocalStorage キー
const STORAGE_KEY = "castcue_tutorial_state";

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<TutorialState>({
    isActive: false,
    currentStep: 0,
    isCompleted: false,
    targetElement: null,
    targetPage: "/dashboard",
    isOverlayHidden: false,
  });

  // 初回ロード時に状態を復元
  useEffect(() => {
    const loadState = async () => {
      try {
        // API から状態を取得
        const response = await fetch("/api/tutorial/status");
        if (response.ok) {
          const data = await response.json();

          // 既に完了している場合はチュートリアルを表示しない
          if (data.tutorial_completed) {
            setState(prev => ({
              ...prev,
              isCompleted: true,
              isActive: false,
              isOverlayHidden: false,
            }));
            return;
          }

          // LocalStorage から一時状態を復元
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const savedState = JSON.parse(saved);
            setState({ ...savedState, isOverlayHidden: false });
          } else {
            // 未開始の場合、ステップ0からスタート
            const step = data.tutorial_step || 0;
            const stepData = TUTORIAL_STEPS[step];
            setState({
              isActive: step === 0, // ステップ0の場合のみウェルカムカードを表示
              currentStep: step,
              isCompleted: false,
              targetElement: stepData?.targetElement || null,
              targetPage: stepData?.targetPage || "/dashboard",
              isOverlayHidden: false,
            });
          }
        }
      } catch (error) {
        console.error("[TutorialContext] Failed to load tutorial state:", error);
      }
    };

    loadState();
  }, []);

  // 状態が変わったら LocalStorage に保存
  useEffect(() => {
    if (state.isActive) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const startTutorial = useCallback(async () => {
    try {
      // ステップ1に進む
      await fetch("/api/tutorial/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorial_step: 1 }),
      });

      const step1 = TUTORIAL_STEPS[1];
      setState({
        isActive: true,
        currentStep: 1,
        isCompleted: false,
        targetElement: step1.targetElement,
        targetPage: step1.targetPage,
        isOverlayHidden: false,
      });

      // 対象ページに遷移
      if (pathname !== step1.targetPage) {
        router.push(step1.targetPage);
      }
    } catch (error) {
      console.error("[TutorialContext] Failed to start tutorial:", error);
    }
  }, [router, pathname]);

  const nextStep = useCallback(async () => {
    const nextStepNum = state.currentStep + 1;

    // ステップ5（完了）の場合
    if (nextStepNum > TUTORIAL_STEPS.length - 1) {
      completeTutorial();
      return;
    }

    try {
      // サーバーに進捗を保存
      await fetch("/api/tutorial/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorial_step: nextStepNum }),
      });

      const nextStepData = TUTORIAL_STEPS[nextStepNum];
      setState({
        isActive: true,
        currentStep: nextStepNum,
        isCompleted: false,
        targetElement: nextStepData.targetElement,
        targetPage: nextStepData.targetPage,
        isOverlayHidden: false,
      });

      // 対象ページに遷移
      if (pathname !== nextStepData.targetPage) {
        router.push(nextStepData.targetPage);
      }
    } catch (error) {
      console.error("[TutorialContext] Failed to proceed to next step:", error);
    }
  }, [state.currentStep, router, pathname]);

  const previousStep = useCallback(async () => {
    const prevStepNum = Math.max(0, state.currentStep - 1);

    try {
      await fetch("/api/tutorial/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorial_step: prevStepNum }),
      });

      const prevStepData = TUTORIAL_STEPS[prevStepNum];
      setState({
        isActive: true,
        currentStep: prevStepNum,
        isCompleted: false,
        targetElement: prevStepData.targetElement,
        targetPage: prevStepData.targetPage,
        isOverlayHidden: false,
      });

      // 対象ページに遷移
      if (pathname !== prevStepData.targetPage) {
        router.push(prevStepData.targetPage);
      }
    } catch (error) {
      console.error("[TutorialContext] Failed to go back:", error);
    }
  }, [state.currentStep, router, pathname]);

  const skipTutorial = useCallback(async () => {
    try {
      await fetch("/api/tutorial/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "user_skip" }),
      });

      setState({
        isActive: false,
        currentStep: 0,
        isCompleted: true,
        targetElement: null,
        targetPage: "/dashboard",
        isOverlayHidden: false,
      });

      // LocalStorage をクリア
      localStorage.removeItem(STORAGE_KEY);

      // ダッシュボードに戻る
      if (pathname !== "/dashboard") {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("[TutorialContext] Failed to skip tutorial:", error);
    }
  }, [router, pathname]);

  const completeTutorial = useCallback(async () => {
    try {
      await fetch("/api/tutorial/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorial_step: 5, tutorial_completed: true }),
      });

      setState({
        isActive: false,
        currentStep: 5,
        isCompleted: true,
        targetElement: null,
        targetPage: "/dashboard",
        isOverlayHidden: false,
      });

      // LocalStorage をクリア
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("[TutorialContext] Failed to complete tutorial:", error);
    }
  }, []);

  const getCurrentStepData = useCallback(() => {
    if (state.currentStep >= 0 && state.currentStep < TUTORIAL_STEPS.length) {
      return TUTORIAL_STEPS[state.currentStep];
    }
    return null;
  }, [state.currentStep]);

  const hideOverlay = useCallback(() => {
    setState(prev => ({ ...prev, isOverlayHidden: true }));
  }, []);

  // 各ステップの完了状態を自動チェックして次へ進む
  useEffect(() => {
    if (!state.isActive) return;

    const checkStepCompletion = async () => {
      try {
        const response = await fetch("/api/tutorial/status");
        if (!response.ok) return;

        const data = await response.json();
        const currentStep = state.currentStep;

        // ステップ1: X連携完了時に次へ
        if (currentStep === 1 && data.x_connected) {
          console.log("[Tutorial] X connected, moving to step 2");
          // オーバーレイを再表示してから次のステップへ
          setState(prev => ({ ...prev, isOverlayHidden: false }));
          setTimeout(async () => {
            // 次のステップに進む
            await fetch("/api/tutorial/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tutorial_step: 2 }),
            });

            const step2 = TUTORIAL_STEPS[2];
            setState({
              isActive: true,
              currentStep: 2,
              isCompleted: false,
              targetElement: step2.targetElement,
              targetPage: step2.targetPage,
              isOverlayHidden: false,
            });
          }, 500);
          return;
        }

        // ステップ2: プッシュ通知有効化時に次へ
        if (currentStep === 2 && data.push_enabled) {
          console.log("[Tutorial] Push enabled, moving to step 3");
          setState(prev => ({ ...prev, isOverlayHidden: false }));
          setTimeout(async () => {
            await fetch("/api/tutorial/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tutorial_step: 3 }),
            });

            const step3 = TUTORIAL_STEPS[3];
            setState({
              isActive: true,
              currentStep: 3,
              isCompleted: false,
              targetElement: step3.targetElement,
              targetPage: step3.targetPage,
              isOverlayHidden: false,
            });
          }, 500);
          return;
        }

        // ステップ3: テンプレート作成時に次へ
        if (currentStep === 3 && data.templates_count > 0) {
          console.log("[Tutorial] Template created, moving to step 4");
          setState(prev => ({ ...prev, isOverlayHidden: false }));
          setTimeout(async () => {
            await fetch("/api/tutorial/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tutorial_step: 4 }),
            });

            const step4 = TUTORIAL_STEPS[4];
            setState({
              isActive: true,
              currentStep: 4,
              isCompleted: false,
              targetElement: step4.targetElement,
              targetPage: step4.targetPage,
              isOverlayHidden: false,
            });
          }, 500);
          return;
        }

        // ステップ4: デフォルトテンプレート設定時に完了
        if (currentStep === 4 && data.default_template_set) {
          console.log("[Tutorial] Default template set, completing tutorial");
          await fetch("/api/tutorial/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tutorial_step: 5, tutorial_completed: true }),
          });

          setState({
            isActive: false,
            currentStep: 5,
            isCompleted: true,
            targetElement: null,
            targetPage: "/dashboard",
            isOverlayHidden: false,
          });

          localStorage.removeItem(STORAGE_KEY);
          return;
        }
      } catch (error) {
        console.error("[Tutorial] Failed to check step completion:", error);
      }
    };

    // 1秒ごとにチェック（ポーリング）
    const interval = setInterval(checkStepCompletion, 1000);
    return () => clearInterval(interval);
  }, [state.isActive, state.currentStep]);

  const value: TutorialContextValue = {
    state,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    getCurrentStepData,
    hideOverlay,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

// カスタムフック
export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
