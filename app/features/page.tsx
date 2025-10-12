import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BarChart3, Shield, Zap, Users, Clock } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "機能｜CastCue",
  description: "CastCueが提供する、配信告知を自動化するための機能をご紹介します。",
};

export default function FeaturesPage() {
  const features = [
    {
      icon: Bell,
      title: "自動で開始ツイート",
      description: "配信を始めると、自動でXにツイートされます。手動での投稿を忘れる心配がありません。",
      details: [
        "Twitch配信開始を即座に検知",
        "カスタマイズ可能なツイート内容",
        "配信ごとに内容を変更可能",
      ]
    },
    {
      icon: BarChart3,
      title: "効果測定グラフ",
      description: "自動ツイートの前後で、どれだけ視聴者が増えたかグラフで確認できます。",
      details: [
        "視聴者数の推移をリアルタイム表示",
        "ツイート効果を数値化",
        "過去のデータと比較分析",
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
      icon: Zap,
      title: "高速通知",
      description: "配信開始から5秒以内に自動ツイート。視聴者を逃しません。",
      details: [
        "平均5秒で通知完了",
        "安定した稼働率",
        "エラー発生時の自動リトライ",
      ]
    },
    {
      icon: Users,
      title: "複数パターンのテスト",
      description: "複数のツイート文を登録して、どれが効果的か比較できます。",
      details: [
        "最大10パターンまで登録可能",
        "ランダムまたは順番に投稿",
        "効果測定で最適なパターンを発見",
      ]
    },
    {
      icon: Clock,
      title: "時間節約",
      description: "告知作業にかかる時間をゼロに。配信に集中できます。",
      details: [
        "月平均2時間の作業時間削減",
        "告知忘れによる機会損失を防止",
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
              CastCueが提供する、配信告知を自動化するための機能をご紹介します。
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
