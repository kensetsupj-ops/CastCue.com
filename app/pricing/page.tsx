import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "料金｜CastCue",
  description: "現在は招待制ベータ版として、完全無料でご利用いただけます。",
};

export default function PricingPage() {
  const features = [
    "配信開始を自動で検知",
    "Xへの自動ツイート",
    "効果測定グラフ",
    "複数パターンのテスト",
    "わかりやすいレポート",
    "優先サポート",
    "無制限の配信通知",
    "カスタマイズ可能なテンプレート",
  ];

  const faqs = [
    {
      q: "ベータ版はいつまで無料ですか？",
      a: "正式リリース後も、ベータ版参加者には特別価格を提供予定です。詳細は決まり次第お知らせします。"
    },
    {
      q: "クレジットカードの登録は必要ですか？",
      a: "ベータ版期間中は一切不要です。登録後すぐにご利用いただけます。"
    },
    {
      q: "正式版の料金はいくらになりますか？",
      a: "現在検討中ですが、月額500円〜1,000円程度を想定しています。ベータ版参加者には特別割引を予定しています。"
    },
  ];

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              料金
            </h1>
            <p className="text-xl text-neutral-sub leading-relaxed">
              現在は招待制ベータ版として、完全無料でご利用いただけます。
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-primary/20 shadow-2xl shadow-primary/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl"></div>
              <CardContent className="p-12 relative">
                <div className="text-center space-y-8">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 text-sm text-primary bg-primary/10 px-6 py-3 rounded-full border border-primary/20">
                    <Sparkles className="h-4 w-4" />
                    招待制ベータ版
                  </div>

                  {/* Price */}
                  <div>
                    <div className="text-7xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent mb-4">
                      無料
                    </div>
                    <p className="text-body text-neutral-sub">
                      ベータ版期間中は完全無料
                    </p>
                  </div>

                  {/* Features */}
                  <div className="py-8 space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 justify-center">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-success/20 to-success/10">
                          <Check className="h-3 w-3 text-success" strokeWidth={3} />
                        </div>
                        <span className="text-body text-neutral-ink font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link href="/login" className="block">
                    <Button size="lg" className="w-full hover-lift shadow-xl shadow-primary/20 text-base py-6">
                      今すぐ無料で始める
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>

                  <p className="text-xs text-neutral-sub">
                    クレジットカード不要 • 招待コード不要 • 30秒で登録完了
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-neutral-border bg-neutral-bg py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto space-y-12">
            <h2 className="text-4xl font-bold text-neutral-ink text-center">
              よくある質問
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-neutral-border">
                  <CardContent className="p-6 space-y-3">
                    <h3 className="text-h3 font-bold text-neutral-ink">
                      {faq.q}
                    </h3>
                    <p className="text-body text-neutral-sub leading-relaxed">
                      {faq.a}
                    </p>
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
