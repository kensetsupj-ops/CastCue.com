import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BarChart3, Shield, Zap, Edit3, Clock } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "機能｜CastCue",
  description: "CastCueが提供する、配信告知を自動化するための機能をご紹介します。",
};

export default function FeaturesPage() {
  const features = [
    {
      icon: Bell,
      title: "忘れない手間もかからない",
      description: "配信開始時にブラウザ通知が届きます。「テンプレートで投稿」「編集して投稿」「スキップ」から選べます。",
      details: [
        "配信開始から平均30秒以内に検知",
        "ブラウザ通知で即座にお知らせ",
        "通知を見逃しても自動投稿可能",
      ]
    },
    {
      icon: Edit3,
      title: "柔軟に編集できる",
      description: "編集画面では過去に効果が高かった文面も表示。それを参考に微調整することもできます。",
      details: [
        "テンプレートを自由にカスタマイズ",
        "配信タイトルやゲーム名を自動挿入",
        "配信ごとに内容を編集可能",
      ]
    },
    {
      icon: BarChart3,
      title: "効果が見える数字",
      description: "告知前と告知後の視聴者数を比較して、「告知で何人増えたか（推定）」を算出します。",
      details: [
        "視聴者数の推移をグラフで表示",
        "告知効果を数値化",
        "過去のデータと比較分析",
      ]
    },
    {
      icon: Zap,
      title: "3つの使い方から選べる",
      description: "完全自動派、確認派、選択派。あなたのペースで運用できます。",
      details: [
        "完全お任せの自動投稿モード",
        "編集してから投稿するモード",
        "気が向いた時だけ投稿するモード",
      ]
    },
    {
      icon: Shield,
      title: "安心・安全",
      description: "あなたのアカウント情報は暗号化されて、安全に保護されています。",
      details: [
        "トークンは暗号化保存",
        "必要最小限の権限のみ要求",
        "SSL/TLS通信で保護",
      ]
    },
    {
      icon: Clock,
      title: "配信に集中できる",
      description: "告知作業にかかる時間をゼロに。告知忘れの不安から解放されます。",
      details: [
        "月平均2時間の作業時間削減",
        "告知忘れの機会損失を防止",
        "ストレスフリーな配信生活",
      ]
    },
  ];

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              機能
            </h1>
            <p className="text-xl text-neutral-sub leading-relaxed">
              配信に没頭できるようになった。<br />
              告知忘れの機会損失をゼロにする機能をご紹介します。
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-8 md:grid-cols-2">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="border-neutral-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                        <feature.icon className="h-8 w-8 text-primary" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-h2 font-bold text-neutral-ink">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-body text-neutral-sub leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-2">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-small text-neutral-sub">
                          <span className="text-primary mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
