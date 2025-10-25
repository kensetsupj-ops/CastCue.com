"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleTwitchLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          scope: 'openid user:read:email', // Twitchからメールアドレスを取得するために必要（openidを追加）
        },
      },
    });

    if (error) {
      console.error('ログインエラー:', error);
      alert('ログインに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-surface overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-border bg-white shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <h1 className="text-h2 font-bold text-neutral-ink hover:text-primary transition-colors cursor-pointer">
              CastCue
            </h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-16 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 py-12">
          {/* Title */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-ink">
              ログイン
            </h1>
            <p className="text-lg text-neutral-sub">
              Twitchアカウントでログインしてください
            </p>
          </div>

          {/* Description */}
          <div className="bg-neutral-bg rounded-lg p-6 border border-neutral-border">
            <p className="text-body text-neutral-ink text-center leading-relaxed">
              Twitch配信の開始を<span className="font-bold text-primary">自動検知</span>し、
              <br />
              X（Twitter）で<span className="font-bold text-primary">即座に自動ツイート</span>。
              <br />
              告知の効果を<span className="font-bold text-primary">リアルタイムで可視化</span>します。
            </p>
          </div>

          {/* Login Button */}
          <div className="space-y-4">
            <Button
              onClick={handleTwitchLogin}
              size="lg"
              className="w-full bg-[#9146FF] hover:bg-[#772CE8] text-white shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
              </svg>
              Twitchでログイン
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-neutral-sub">
              クレジットカード不要 • 招待制ベータ期間中は完全無料
            </p>

            <p className="text-xs text-center text-neutral-sub">
              ログインすると、
              <Link href="/terms" className="text-primary hover:text-primary-hover underline underline-offset-4">
                利用規約
              </Link>
              と
              <Link href="/privacy" className="text-primary hover:text-primary-hover underline underline-offset-4">
                プライバシーポリシー
              </Link>
              に同意したものとみなされます
            </p>
          </div>

          {/* Features Preview */}
          <div className="pt-8 space-y-4">
            <h3 className="text-center text-sm font-bold text-neutral-ink">
              主な機能
            </h3>
            <div className="grid gap-3">
              {[
                "配信開始を自動で検知",
                "Xへの自動ツイート",
                "効果測定グラフ",
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-bg border border-neutral-border"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-success/20 to-success/10 flex-shrink-0">
                    <svg className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-neutral-ink font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center pt-4">
            <Link
              href="/"
              className="text-sm text-neutral-sub hover:text-primary transition-colors"
            >
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
