import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Shield, ArrowRight, Check, TrendingUp, Users, Clock, Sparkles, Bell, Edit3, Zap, Target } from "lucide-react";
import ScrollToTop from "@/components/ScrollToTop";
import ScrollReveal from "@/components/ScrollReveal";
import { homeMetadata } from "@/lib/seo/metadata";
import { SoftwareApplicationSchema, FAQPageSchema, OrganizationSchema, WebSiteSchema } from "@/lib/seo/structured-data";

export const metadata = homeMetadata;

export default function Home() {
  const features = [
    {
      icon: Bell,
      title: "忘れない手間もかからない",
      description: "配信開始時にブラウザ通知が届きます。「テンプレートで投稿」「編集して投稿」「スキップ」から選べます。",
      stat: "30秒",
    },
    {
      icon: Edit3,
      title: "柔軟に編集できる",
      description: "編集画面では過去に効果が高かった文面も表示。それを参考に微調整することもできます。",
      stat: "自由",
    },
    {
      icon: BarChart3,
      title: "効果が見える数字",
      description: "告知前と告知後の視聴者数を比較して、「告知で何人呼べたか」を自動算出。配信前のマーケティング効果を可視化します。",
      stat: "+18%",
    },
  ];

  const useCases = [
    {
      icon: Zap,
      title: "完全自動派",
      subtitle: "「配信に集中したいから、全部自動で」",
      description: "事前にテンプレートを登録し、未操作時は自動投稿。通知を確認せず配信に集中。",
      result: "完全にお任せ、手間ゼロ。忘れる心配もゼロ。",
    },
    {
      icon: Edit3,
      title: "確認派",
      subtitle: "「文面は確認してから投稿したい」",
      description: "通知が来たら「編集して投稿」を選択。配信タイトルや気分に合わせて微調整。",
      result: "柔軟に、でも迅速に。忘れることはない。",
    },
    {
      icon: Target,
      title: "選択派",
      subtitle: "「気が向いた時だけ投稿したい」",
      description: "未操作時は「スキップ」に設定。通知が来たら、その時の気分で判断。",
      result: "あなたのペースで。でも通知が来るから忘れない。",
    },
  ];

  const steps = [
    {
      step: "1",
      title: "検知",
      description: "配信開始から平均30秒以内に検知",
    },
    {
      step: "2",
      title: "合図",
      description: "ブラウザ通知で確認→そのまま投稿 or 編集して投稿",
    },
    {
      step: "3",
      title: "測定",
      description: "告知前後の視聴者数を記録して効果を算出",
    },
  ];

  const testimonials = [
    {
      quote: "配信開始のツイート、3回に1回は忘れてた。CastCueを使ってから、告知忘れがゼロになった。",
      author: "週3配信のゲーム実況者",
    },
    {
      quote: "告知の手間がなくなって、配信開始がスムーズになった。視聴者数も平均で15%くらい増えた気がする。",
      author: "Apexストリーマー",
    },
    {
      quote: "通知が来るから忘れることがないし、編集もサクッとできるから手間もかからない。",
      author: "雑談配信者",
    },
  ];

  const faqs = [
    {
      question: "配信の度に設定が必要ですか？",
      answer: "不要です。初回にTwitchとXを接続し、テンプレートを登録すれば、あとは配信するだけで自動で動きます。",
    },
    {
      question: "投稿内容は編集できますか？",
      answer: "できます。配信開始時にブラウザ通知が届くので、「そのまま投稿」または「編集して投稿」を選べます。編集画面では、過去に効果が高かった文面も表示されるので、それを参考に微調整することもできます。また、設定で「未操作時の挙動」を選べるので、自動投稿（完全お任せ）またはスキップ（投稿しない）のどちらかを選択できます。",
    },
    {
      question: "通知に気づかなかったらどうなりますか？",
      answer: "設定で「未操作時の挙動」を選べます。「自動投稿」に設定すれば、猶予時間後に自動で投稿されます。「スキップ」に設定すれば、何もせず記録だけ残ります。猶予時間は30秒〜120秒で自由に設定できます。",
    },
    {
      question: "配信が終わったら何か設定が必要ですか？",
      answer: "不要です。CastCueは配信の開始を検知して告知しますが、配信終了後に特別な操作は必要ありません。視聴者数のサンプリングは自動で終了し、ダッシュボードで効果を確認できる状態になります。",
    },
    {
      question: "投稿の効果は分かりますか？",
      answer: "はい、分かります。告知後の視聴者増加数（呼べた人数）やクリック数を自動追跡し、ダッシュボードで確認できます。Twitchダッシュボードでは見えない「配信前のマーケティング」効果を可視化します。",
    },
    {
      question: "告知を忘れたらどうなりますか？",
      answer: "CastCueは配信開始を自動で検知するので、忘れることはありません。必ずブラウザ通知が届きます。完全自動モードにすれば、通知を見逃しても自動で投稿されます。",
    },
    {
      question: "YouTubeやTikTokには対応していますか？",
      answer: "現在はTwitch専用です。他プラットフォームは今後の予定です。",
    },
  ];

  const benefits = [
    "告知を自動で投稿",
    "そのまま投稿も編集も選べる",
    "視聴者の増加が数字でわかる",
    "配信に集中できる",
    "複数パターンで効果を比較",
    "わかりやすいグラフで改善",
  ];

  return (
    <div className="min-h-screen bg-neutral-surface overflow-hidden">
      {/* 構造化データ（JSON-LD） */}
      <SoftwareApplicationSchema />
      <FAQPageSchema />
      <OrganizationSchema />
      <WebSiteSchema />

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
              配信の幕開けを逃さない。
            </h2>

            {/* Sub Headline */}
            <p className="text-base md:text-lg text-white leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              配信が始まったその瞬間、あなたの代わりに告知。
              <br />
              そのまま投稿も、編集してから投稿も選べます。
              <br />
              そして、告知の効果も自動で追跡。
            </p>

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
          </div>
        </div>
      </section>

      {/* Why Section - 課題提示 */}
      <section className="relative border-b border-neutral-border bg-gradient-to-b from-white via-neutral-surface to-neutral-bg overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]"></div>
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-danger/5 to-transparent rounded-full blur-3xl"></div>
        <div className="container py-24 relative">
          <div className="mx-auto max-w-4xl text-center">
            <ScrollReveal>
            <div className="space-y-8">
              <h3 className="text-5xl font-bold text-neutral-ink mb-6">
                配信を始めたのに
                <br />
                <span className="bg-gradient-to-r from-danger to-warning bg-clip-text text-transparent">
                  誰にも届いていない。
                </span>
              </h3>
              <div className="max-w-3xl mx-auto space-y-6 text-lg text-neutral-sub leading-relaxed">
                <p>
                  配信ボタンを押した瞬間から、観客は集まり始めます。<br />
                  でも、配信設定を確認して、マイクテストをして、<br />
                  チャットに挨拶をしていたら――
                </p>
                <p className="text-2xl font-bold text-danger">
                  「あ、X（Twitter）に告知するの忘れてた」
                </p>
                <p>
                  気づいた時には配信開始から10分。<br />
                  ゴールデンタイムは、もう終わっています。
                </p>
                <div className="pt-6 border-t border-neutral-border">
                  <p className="text-xl font-semibold text-neutral-ink">
                    告知の手間と、忘れることの機会損失。<br />
                    この2つが、あなたの配信の成長を遅らせています。
                  </p>
                </div>
              </div>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative border-b border-neutral-border bg-gradient-to-br from-neutral-surface via-primary/[0.02] to-neutral-surface overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/8 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-success/8 to-transparent rounded-full blur-3xl"></div>
        <div className="container py-24 relative">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
            <div className="text-center mb-16">
              <h3 className="text-5xl font-bold text-neutral-ink mb-6">
                CastCueはあなたの
                <br />
                <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  「呼び込み係」
                </span>
              </h3>
              <p className="text-lg text-neutral-sub max-w-2xl mx-auto">
                配信が始まった瞬間を検知して、事前に用意した文面で即座に告知。<br />
                もう忘れることはありません。
              </p>
            </div>
            </ScrollReveal>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <ScrollReveal delay={index * 100} key={index}>
                <Card
                  className="border-neutral-border hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 group"
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
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative border-b border-neutral-border bg-gradient-to-b from-neutral-bg via-success/[0.02] to-neutral-surface overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,197,94,0.05),transparent_50%)]"></div>
        <div className="container py-24 relative">
          <div className="mx-auto max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <ScrollReveal className="scroll-reveal-left">
              <div className="space-y-8">
                <div>
                  <h3 className="text-4xl font-bold text-neutral-ink mb-4">
                    最適な一手を
                    <br />
                    <span className="bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">
                      学んでいく
                    </span>
                  </h3>
                  <p className="text-body text-neutral-sub leading-relaxed">
                    どの文面が強いのか。どの時間帯が伸びやすいのか。<br />
                    配信前のマーケティング効果をデータで見える化し、次の一手が見えてきます。
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
              </ScrollReveal>

              <ScrollReveal className="scroll-reveal-right" delay={200}>
              <div className="relative">
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
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section - 3パターン */}
      <section className="relative border-b border-neutral-border bg-gradient-to-b from-neutral-surface to-neutral-bg overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-primary/5 via-transparent to-success/5 rounded-full blur-3xl"></div>
        <div className="container py-24 relative">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
            <div className="text-center mb-16">
              <h3 className="text-5xl font-bold text-neutral-ink mb-6">
                配信者によって
                <br />
                <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  使い方はそれぞれ
                </span>
              </h3>
              <p className="text-lg text-neutral-sub max-w-2xl mx-auto">
                自動化しつつも、あなたのペースで運用できます。
              </p>
            </div>
            </ScrollReveal>

            <div className="grid gap-6 md:grid-cols-3">
              {useCases.map((useCase, index) => (
                <ScrollReveal delay={index * 100} key={index}>
                <Card
                  className="border-neutral-border hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 group"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                      <useCase.icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h4 className="text-h3 font-bold text-neutral-ink group-hover:text-primary transition-colors mb-2">
                        {useCase.title}
                      </h4>
                      <p className="text-sm text-neutral-sub italic mb-3">
                        {useCase.subtitle}
                      </p>
                    </div>
                    <p className="text-small text-neutral-sub leading-relaxed">
                      {useCase.description}
                    </p>
                    <div className="pt-3 border-t border-neutral-border">
                      <p className="text-sm font-semibold text-primary">
                        → {useCase.result}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative border-b border-neutral-border bg-gradient-to-b from-neutral-bg to-neutral-surface overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.05),transparent_50%)]"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-primary/8 to-transparent rounded-full blur-3xl"></div>
        <div className="container py-24 relative">
          <div className="mx-auto max-w-4xl">
            <ScrollReveal>
            <div className="text-center mb-16">
              <h3 className="text-5xl font-bold text-neutral-ink mb-6">
                <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  配信の裏側で
                </span>
                <br />
                自動で動く
              </h3>
              <p className="text-lg text-neutral-sub max-w-2xl mx-auto">
                配信開始を検知して、通知・投稿・測定まで。配信前のマーケティングも、すべて自動化されています。
              </p>
            </div>
            </ScrollReveal>

            <div className="space-y-6">
              {steps.map((item, index) => (
                <ScrollReveal delay={index * 100} key={index}>
                <div
                  className="flex gap-6 p-6 rounded-xl border border-neutral-border bg-neutral-surface hover:border-primary/50 hover:shadow-xl transition-all duration-300 group"
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
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={400}>
            <div className="mt-12 text-center">
              <Link href="/login">
                <Button size="lg" className="hover-lift shadow-xl shadow-primary/20">
                  セットアップを始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative border-b border-neutral-border bg-gradient-to-br from-neutral-surface via-success/[0.02] to-neutral-bg overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-success/8 to-transparent rounded-full blur-3xl"></div>
        <div className="container py-24 relative">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
            <div className="text-center mb-16">
              <h3 className="text-5xl font-bold text-neutral-ink mb-6">
                配信に
                <br />
                <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  没頭できるようになった
                </span>
              </h3>
              <p className="text-lg text-neutral-sub max-w-2xl mx-auto">
                告知の不安から解放された配信者たち。
              </p>
            </div>
            </ScrollReveal>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <ScrollReveal delay={index * 100} key={index}>
                <Card
                  className="border-neutral-border hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-6 space-y-4">
                    <p className="text-body text-neutral-ink leading-relaxed italic">
                      「{testimonial.quote}」
                    </p>
                    <div className="pt-3 border-t border-neutral-border">
                      <p className="text-small text-neutral-sub font-medium">
                        — {testimonial.author}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative border-b border-neutral-border bg-gradient-to-b from-neutral-bg via-primary/[0.015] to-neutral-surface overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.01]"></div>
        <div className="container py-24 relative">
          <div className="mx-auto max-w-4xl">
            <ScrollReveal>
            <div className="text-center mb-16">
              <h3 className="text-5xl font-bold text-neutral-ink mb-6">
                よくある質問
              </h3>
              <p className="text-lg text-neutral-sub max-w-2xl mx-auto">
                CastCueについてよく寄せられる質問にお答えします。
              </p>
            </div>
            </ScrollReveal>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <ScrollReveal delay={index * 50} key={index}>
                <Card
                  className="border-neutral-border hover:border-primary/30 transition-all duration-300"
                >
                  <CardContent className="p-6 space-y-3">
                    <h4 className="text-lg font-bold text-neutral-ink">
                      Q: {faq.question}
                    </h4>
                    <p className="text-body text-neutral-sub leading-relaxed">
                      A: {faq.answer}
                    </p>
                  </CardContent>
                </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Hint */}
      <section className="relative border-b border-neutral-border bg-gradient-to-b from-neutral-surface to-neutral-bg overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl"></div>
        <div className="container py-24 relative">
          <div className="mx-auto max-w-5xl">
            <ScrollReveal className="scroll-reveal-scale">
            <Card className="border-2 border-primary/20 shadow-2xl shadow-primary/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl"></div>
              <CardContent className="p-12 relative">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-5xl font-bold bg-gradient-to-r from-neutral-ink to-primary bg-clip-text text-transparent mb-4">
                        まずはベータ版で
                      </h3>
                      <p className="text-body text-neutral-sub leading-relaxed mb-2">
                        現在はクローズドβ版として、招待制で運営しています。
                      </p>
                      <p className="text-body text-neutral-sub leading-relaxed mb-2">
                        配信者のみなさんと一緒に育てていくフェーズです。
                      </p>
                      <p className="text-body text-primary font-semibold leading-relaxed">
                        登録すれば、すぐにお使いいただけます。
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
                        無料で始める
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
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-neutral-border bg-gradient-to-br from-primary/10 via-transparent to-success/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[120px]"></div>

        <div className="container py-32 relative">
          <ScrollReveal>
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <h3 className="text-6xl font-bold bg-gradient-to-r from-neutral-ink via-primary to-success bg-clip-text text-transparent">
              告知忘れの機会損失を
              <br />
              ゼロにしよう
            </h3>
            <p className="text-xl text-neutral-sub max-w-2xl mx-auto leading-relaxed">
              告知を忘れることも、手間をかけることもない。<br />
              配信前のマーケティングを自動化しつつも、あなたのペースで運用できます。
              <br /><br />
              登録は無料、設定は3分で完了します。
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link href="/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base px-10 py-7 shadow-2xl shadow-primary/30 hover-lift bg-gradient-to-r from-primary to-primary-hover"
                >
                  今すぐ始める
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
          </ScrollReveal>
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
                配信前のマーケティングを自動化
              </p>
              <p className="text-xs text-neutral-sub italic">
                Your live, on cue.
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
