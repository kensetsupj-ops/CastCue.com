import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Shield, ArrowRight, Check, TrendingUp, Users, Clock, Sparkles, Bell } from "lucide-react";
import ScrollToTop from "@/components/ScrollToTop";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CastCue｜配信開始を、自動でツイート。",
  description: "Twitch配信の開始を自動検知し、X（Twitter）で即座に自動ツイート。告知の効果をリアルタイムで可視化します。",
};

export default function Home() {
  const features = [
    {
      icon: Bell,
      title: "自動で開始ツイート",
      description: "配信を始めると、自動でXにツイートされます。",
      stat: "5秒",
    },
    {
      icon: BarChart3,
      title: "効果がわかる",
      description: "自動ツイートの前後で、どれだけ視聴者が増えたかグラフで確認できます",
      stat: "+18%",
    },
    {
      icon: Shield,
      title: "安心・安全",
      description: "あなたのアカウント情報は暗号化されて、安全に保護されています",
      stat: "安全",
    },
  ];

  const steps = [
    {
      step: "1",
      title: "Twitchアカウントを接続",
      description: "配信開始を自動検知するため、Twitchアカウントを接続します",
      time: "30秒",
    },
    {
      step: "2",
      title: "Xアカウントを連携",
      description: "告知先のX（Twitter）アカウントを設定します",
      time: "1分",
    },
    {
      step: "3",
      title: "テンプレートを作成",
      description: "告知メッセージのテンプレートを作成。複数パターンのテストも可能です",
      time: "2分",
    },
    {
      step: "4",
      title: "配信を開始",
      description: "あとは配信を始めるだけ。自動で告知してダッシュボードで効果を確認",
      time: "0秒",
    },
  ];

  const stats = [
    { value: "5秒", label: "平均通知速度" },
    { value: "99.9%", label: "稼働率" },
    { value: "10,000+", label: "月間配信通知" },
    { value: "500+", label: "アクティブ配信者" },
  ];

  const benefits = [
    "告知を自動で投稿",
    "配信ごとに内容を変えられる",
    "視聴者の増加が数字でわかる",
    "制限を気にせず使える",
    "配信に集中できる",
    "複数パターンで効果を比較",
    "わかりやすいグラフで改善",
  ];

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
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hover-lift">ログイン</Button>
            </Link>
            <Link href="/login">
              <Button className="hover-lift shadow-lg shadow-primary/25">
                無料で始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background Image - Full Width */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-desktop.jpg"
            alt="CastCue - 配信者がダッシュボードを使用している様子"
            fill
            priority
            quality={90}
            className="object-cover"
          />
          {/* Gradient overlay for text readability - darker on left */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent"></div>
        </div>

        {/* Hero Content - Left side overlay */}
        <div className="container relative z-10 flex items-start min-h-screen pt-32 md:pt-40 pb-24 md:pb-32">
          <div className="w-full md:w-2/5 lg:w-1/2 space-y-5 md:space-y-6">
            {/* Hero Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] animate-fade-in-up">
              CastCue
            </h1>

            {/* Badge */}
            <div className="inline-flex items-center rounded-full border border-white/40 bg-white/25 px-4 py-2 text-xs md:text-sm text-white shadow-xl backdrop-blur-md hover-lift animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Sparkles className="mr-2 h-3 w-3 animate-pulse" />
              招待制ベータ版として運用中
            </div>

            {/* Main Headline */}
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              配信開始を、自動でツイート。
            </h2>

            {/* Sub Headline */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 animate-fade-in-up inline-block" style={{ animationDelay: '300ms' }}>
              <p className="text-base md:text-lg text-white leading-relaxed">
                Twitch配信の開始を<span className="font-bold text-primary-foreground">自動検知</span>し、
                <br />
                X（Twitter）で<span className="font-bold text-primary-foreground">即座に自動ツイート</span>。
                <br />
                告知の効果を<span className="font-bold text-primary-foreground">リアルタイムで可視化</span>します。
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <Link href="/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-6 shadow-2xl shadow-black/50 hover-lift bg-gradient-to-r from-primary to-primary-hover hover:scale-105 transition-transform"
                >
                  今すぐ無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Trust Indicator */}
            <p className="text-sm text-white/90 pt-4 drop-shadow-lg bg-black/20 backdrop-blur-sm inline-block px-4 py-2 rounded-md animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              クレジットカード不要 • 招待制ベータ期間中は完全無料
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-neutral-border bg-neutral-surface">
        <div className="container py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 animate-fade-in-up">
              <h3 className="text-5xl font-bold text-neutral-ink mb-6">
                Twitch配信者のための
                <br />
                <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  完全自動化ツール
                </span>
              </h3>
              <p className="text-lg text-neutral-sub max-w-2xl mx-auto">
                配信開始の通知から効果測定まで、すべて自動化。
                あなたは配信に集中するだけ。
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="border-neutral-border hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 group animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                        <feature.icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
                      </div>
                      <div className="text-2xl font-bold text-primary/60 group-hover:text-primary transition-colors">
                        {feature.stat}
                      </div>
                    </div>
                    <h4 className="text-h3 font-bold text-neutral-ink group-hover:text-primary transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-small text-neutral-sub leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-neutral-bg to-neutral-surface">
        <div className="container py-24">
          <div className="mx-auto max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 animate-fade-in-up">
                <div>
                  <h3 className="text-4xl font-bold text-neutral-ink mb-4">
                    配信者の成長を
                    <br />
                    <span className="bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">
                      加速させる
                    </span>
                  </h3>
                  <p className="text-body text-neutral-sub leading-relaxed">
                    CastCueを使えば、告知作業にかかる時間をゼロにし、
                    視聴者数の増加を数値で確認できます。
                  </p>
                </div>

                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-success/20 to-success/10 flex-shrink-0 mt-0.5">
                        <Check className="h-4 w-4 text-success" strokeWidth={3} />
                      </div>
                      <span className="text-body text-neutral-ink font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-6">
                  <Link href="/login">
                    <Button size="lg" className="hover-lift shadow-xl shadow-primary/20">
                      今すぐ無料で始める
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-success/20 rounded-2xl blur-3xl"></div>
                <Card className="border-neutral-border shadow-2xl relative backdrop-blur-sm bg-neutral-surface/80">
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-success/10 to-success/5 border border-success/20">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-8 w-8 text-success" />
                          <div>
                            <div className="text-xs text-neutral-sub">視聴者増加（一例）</div>
                            <div className="text-2xl font-bold text-success">+18%</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                        <div className="flex items-center gap-3">
                          <Users className="h-8 w-8 text-primary" />
                          <div>
                            <div className="text-xs text-neutral-sub">新規視聴者（一例）</div>
                            <div className="text-2xl font-bold text-primary">+125人</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20">
                        <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8 text-warning" />
                          <div>
                            <div className="text-xs text-neutral-sub">節約時間/月</div>
                            <div className="text-2xl font-bold text-warning">2時間</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-border">
                      <p className="text-xs text-neutral-sub text-center">
                        * ベータテスト参加者の実測例（2025年9月）
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-neutral-border bg-neutral-surface">
        <div className="container py-24">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-16 animate-fade-in-up">
              <h3 className="text-5xl font-bold text-neutral-ink mb-6">
                <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  たった4ステップ
                </span>
                で
                <br />
                すぐに始められます
              </h3>
              <p className="text-lg text-neutral-sub max-w-2xl mx-auto">
                セットアップは10分以内。難しい設定は一切不要です。
              </p>
            </div>

            <div className="space-y-6">
              {steps.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-6 p-6 rounded-xl border border-neutral-border bg-neutral-surface hover:border-primary/50 hover:shadow-xl transition-all duration-300 group animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-xl font-bold text-white shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">
                    {item.step}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-h3 font-bold text-neutral-ink group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-body text-neutral-sub">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <Link href="/login">
                <Button size="lg" className="hover-lift shadow-xl shadow-primary/20">
                  セットアップを始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Hint */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-neutral-bg to-neutral-surface">
        <div className="container py-24">
          <div className="mx-auto max-w-5xl">
            <Card className="border-2 border-primary/20 shadow-2xl shadow-primary/10 overflow-hidden relative animate-fade-in-up">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl"></div>
              <CardContent className="p-12 relative">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-5xl font-bold bg-gradient-to-r from-neutral-ink to-primary bg-clip-text text-transparent mb-4">
                        招待制ベータ
                      </h3>
                      <p className="text-body text-neutral-sub leading-relaxed">
                        現在は招待制ベータ版として<span className="text-primary font-semibold">完全無料</span>でご利用いただけます。
                      </p>
                    </div>

                    <ul className="space-y-3">
                      {["配信開始を自動で検知", "Xへの自動ツイート", "効果測定グラフ", "複数パターンのテスト", "わかりやすいレポート", "優先サポート"].map((item, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-success/20 to-success/10">
                            <Check className="h-3 w-3 text-success" strokeWidth={3} />
                          </div>
                          <span className="text-body text-neutral-ink font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center backdrop-blur-sm">
                      <div className="text-caption text-neutral-sub uppercase tracking-wide mb-2">
                        現在の料金
                      </div>
                      <div className="text-6xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent mb-2">
                        無料
                      </div>
                      <div className="text-small text-neutral-sub mb-6">
                        招待制ベータ期間中
                      </div>
                      <div className="inline-flex items-center gap-2 text-xs text-success bg-success/10 px-4 py-2 rounded-full border border-success/20">
                        <Sparkles className="h-3 w-3" />
                        クレジットカード不要
                      </div>
                    </div>

                    <Link href="/login" className="block">
                      <Button size="lg" className="w-full hover-lift shadow-xl shadow-primary/20 text-base py-6">
                        今すぐ始める
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>

                    <p className="text-xs text-center text-neutral-sub">
                      招待コード不要 • 30秒で登録完了
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-neutral-border bg-gradient-to-br from-primary/10 via-transparent to-success/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[120px]"></div>

        <div className="container py-32 relative">
          <div className="mx-auto max-w-4xl text-center space-y-8 animate-fade-in-up">
            <h3 className="text-6xl font-bold bg-gradient-to-r from-neutral-ink via-primary to-success bg-clip-text text-transparent">
              配信の成長を、
              <br />
              今日から加速させよう
            </h3>
            <p className="text-xl text-neutral-sub max-w-2xl mx-auto leading-relaxed">
              招待制ベータ版として、配信者の方々と一緒に開発を進めています。
              <br />
              あなたも今すぐ無料で始めませんか？
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link href="/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base px-10 py-7 shadow-2xl shadow-primary/30 hover-lift bg-gradient-to-r from-primary to-primary-hover"
                >
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 text-sm text-neutral-sub">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>クレジットカード不要</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>30秒で登録完了</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>いつでもキャンセル可</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-surface border-t border-neutral-border">
        <div className="container py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <Link href="/">
                <h1 className="text-h2 font-bold text-neutral-ink hover:text-primary transition-colors cursor-pointer">
                  CastCue
                </h1>
              </Link>
              <p className="text-small text-neutral-sub">
                配信者のための完全自動化ツール
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-neutral-ink mb-4">プロダクト</h4>
              <ul className="space-y-2 text-sm text-neutral-sub">
                <li><Link href="/features" className="hover:text-primary transition-colors">機能</Link></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">料金</Link></li>
                <li><Link href="/how-to-use" className="hover:text-primary transition-colors">使い方</Link></li>
                <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-neutral-ink mb-4">会社</h4>
              <ul className="space-y-2 text-sm text-neutral-sub">
                <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-primary transition-colors">ブログ</Link></li>
                <li><Link href="/careers" className="hover:text-primary transition-colors">採用</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">お問い合わせ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-neutral-ink mb-4">法務</h4>
              <ul className="space-y-2 text-sm text-neutral-sub">
                <li><Link href="/terms" className="hover:text-primary transition-colors">利用規約</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition-colors">プライバシーポリシー</Link></li>
                <li><Link href="/legal" className="hover:text-primary transition-colors">特定商取引法</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-small text-neutral-sub">
              &copy; 2025 CastCue. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-neutral-sub hover:text-primary transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
      <ScrollToTop />
    </div>
  );
}
