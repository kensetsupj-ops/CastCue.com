"use client";

import { useState } from "react";
import { MessageSquare, X, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<"bug" | "feature" | "other">("other");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // TODO: フィードバック送信APIを実装
      // 現在はコンソールにログ出力のみ
      console.log("Feedback submitted:", {
        category,
        feedback,
        email: email || "未入力",
        timestamp: new Date().toISOString(),
        url: window.location.href,
      });

      // 仮の遅延（実際のAPI呼び出しをシミュレート）
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSubmitStatus("success");

      // 2秒後にモーダルを閉じる
      setTimeout(() => {
        setIsOpen(false);
        setFeedback("");
        setEmail("");
        setCategory("other");
        setSubmitStatus(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* フィードバックボタン（右下固定） */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        aria-label="フィードバックを送る"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="font-medium">フィードバック</span>
      </button>

      {/* フィードバックモーダル */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <Card
            className="max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-bold text-neutral-ink dark:text-gray-100">
                フィードバックを送る
              </CardTitle>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-neutral-bg dark:hover:bg-gray-700 transition-colors"
                aria-label="閉じる"
              >
                <X className="h-5 w-5 text-neutral-sub dark:text-gray-400" />
              </button>
            </CardHeader>

            <CardContent>
              {submitStatus === "success" ? (
                <div className="py-8 text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-ink dark:text-gray-100">
                      送信完了
                    </h3>
                    <p className="text-sm text-neutral-sub dark:text-gray-400 mt-2">
                      フィードバックをありがとうございます！
                    </p>
                  </div>
                </div>
              ) : submitStatus === "error" ? (
                <div className="py-8 text-center space-y-4">
                  <AlertCircle className="h-16 w-16 text-danger mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-ink dark:text-gray-100">
                      送信失敗
                    </h3>
                    <p className="text-sm text-neutral-sub dark:text-gray-400 mt-2">
                      もう一度お試しください
                    </p>
                  </div>
                  <Button onClick={() => setSubmitStatus(null)} variant="outline">
                    戻る
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* カテゴリー選択 */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2">
                      カテゴリー
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCategory("bug")}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                          category === "bug"
                            ? "bg-danger/10 border-danger text-danger font-medium"
                            : "border-neutral-border dark:border-gray-700 text-neutral-sub dark:text-gray-400 hover:border-primary"
                        }`}
                      >
                        バグ報告
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategory("feature")}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                          category === "feature"
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "border-neutral-border dark:border-gray-700 text-neutral-sub dark:text-gray-400 hover:border-primary"
                        }`}
                      >
                        機能要望
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategory("other")}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                          category === "other"
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "border-neutral-border dark:border-gray-700 text-neutral-sub dark:text-gray-400 hover:border-primary"
                        }`}
                      >
                        その他
                      </button>
                    </div>
                  </div>

                  {/* フィードバック本文 */}
                  <div>
                    <label
                      htmlFor="feedback"
                      className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2"
                    >
                      フィードバック内容 <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="ご意見・ご要望をお聞かせください"
                      required
                      rows={5}
                      className="w-full px-3 py-2 border border-neutral-border dark:border-gray-700 rounded-md text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 placeholder:text-neutral-sub dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  {/* メールアドレス（オプション） */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2"
                    >
                      メールアドレス（任意）
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="返信が必要な場合はご入力ください"
                      className="w-full px-3 py-2 border border-neutral-border dark:border-gray-700 rounded-md text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 placeholder:text-neutral-sub dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* 送信ボタン */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={isSubmitting}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !feedback.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          送信中...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          送信
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
