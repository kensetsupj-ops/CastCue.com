import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "使い方｜CastCue",
  description: "たった4ステップで、配信告知を自動化できます。セットアップは10分以内に完了します。",
};

export default function HowToUsePage() {
  const steps = [
    {
      step: "1",
      title: "Twitchアカウントを接続",
      description: "配信開始を自動検知するため、Twitchアカウントを接続します。",
      details: [
        "CastCueにログインします",
        "「連携設定」から「Twitch接続」をクリック",
        "Twitchの認証画面で「許可」をクリック",
        "接続完了！配信開始を自動で検知できるようになります",
      ]
    },
    {
      step: "2",
      title: "Xアカウントを連携",
      description: "告知先のX（Twitter）アカウントを設定します。",
      details: [
        "「連携設定」から「X連携」をクリック",
        "Xの認証画面で「連携アプリを認証」をクリック",
        "接続完了！自動ツイートができるようになります",
        "※複数アカウントの連携も可能です（将来対応予定）",
      ]
    },
    {
      step: "3",
      title: "テンプレートを作成",
      description: "告知メッセージのテンプレートを作成します。",
      details: [
        "「テンプレート」ページに移動",
        "「新規作成」をクリック",
        "ツイート内容を入力（変数も使用可能）",
        "複数パターン作成して効果を比較することも可能です",
      ]
    },
    {
      step: "4",
      title: "配信を開始",
      description: "あとは配信を始めるだけ。自動で告知してダッシュボードで効果を確認できます。",
      details: [
        "いつも通りTwitchで配信を開始",
        "CastCueが自動的に配信開始を検知",
        "設定したテンプレートでXに自動ツイート",
        "ダッシュボードで効果をリアルタイム確認",
      ]
    },
  ];

  const tips = [
    {
      title: "配信タイトルは自動で反映される",
      description: "Twitchで設定した配信タイトルやゲーム名が自動的にツイートに反映されます。"
    },
    {
      title: "複数パターンでテストしよう",
      description: "異なる文言のテンプレートを複数作成し、どれが効果的か比較できます。"
    },
    {
      title: "配信ごとに内容を変えられる",
      description: "テンプレートをベースに、配信前に内容を編集することも可能です。"
    },
  ];

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              使い方
            </h1>
            <p className="text-xl text-neutral-sub leading-relaxed">
              たった4ステップで、配信告知を自動化できます。セットアップは10分以内に完了します。
            </p>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-8">
            {steps.map((item, index) => (
              <Card
                key={index}
                className="border-neutral-border hover:border-primary/50 hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-8">
                  <div className="flex gap-6">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-2xl font-bold text-white shadow-lg shadow-primary/25">
                      {item.step}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-h2 font-bold text-neutral-ink mb-2">
                          {item.title}
                        </h3>
                        <p className="text-body text-neutral-sub">
                          {item.description}
                        </p>
                      </div>
                      <ol className="space-y-2 list-decimal list-inside text-small text-neutral-sub">
                        {item.details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="border-t border-neutral-border bg-neutral-bg py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-4xl font-bold text-neutral-ink text-center">
              活用のヒント
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {tips.map((tip, index) => (
                <Card key={index} className="border-neutral-border">
                  <CardContent className="p-6 space-y-3">
                    <h3 className="text-h3 font-bold text-neutral-ink">
                      {tip.title}
                    </h3>
                    <p className="text-small text-neutral-sub leading-relaxed">
                      {tip.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-neutral-border py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-4xl font-bold text-neutral-ink">
              今すぐ始めてみましょう
            </h2>
            <p className="text-body text-neutral-sub">
              無料で今すぐ使い始められます。クレジットカード不要。
            </p>
            <div className="pt-4">
              <Link href="/login">
                <Button size="lg" className="hover-lift shadow-xl shadow-primary/20">
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
