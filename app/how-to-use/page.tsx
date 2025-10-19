import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { howToUseMetadata } from "@/lib/seo/metadata";
import { HowToSchema } from "@/lib/seo/structured-data";

export const metadata = howToUseMetadata;

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
        "接続完了！ツイートできるようになります",
        "※複数アカウントの連携も可能です（将来対応予定）",
      ]
    },
    {
      step: "3",
      title: "テンプレートと設定を作成",
      description: "告知メッセージのテンプレートと、あなたの使い方を設定します。",
      details: [
        "「テンプレート」ページでツイート内容を作成",
        "変数（配信タイトル、URLなど）も使用可能",
        "「設定」で未操作時の挙動を選択（自動投稿 or スキップ）",
        "複数パターン作成して効果を比較することも可能",
      ]
    },
    {
      step: "4",
      title: "配信を開始",
      description: "あとは配信を始めるだけ。通知が来たらお好みの方法で対応できます。",
      details: [
        "いつも通りTwitchで配信を開始",
        "CastCueが自動的に配信開始を検知",
        "ブラウザ通知で「テンプレートで投稿」「編集して投稿」「スキップ」から選択",
        "未操作時は設定した挙動（自動投稿 or スキップ）で動作",
      ]
    },
  ];

  const tips = [
    {
      title: "3つの使い方から選べる",
      description: "完全自動派、確認派、選択派。あなたのペースで運用できます。設定で未操作時の挙動を選べます。"
    },
    {
      title: "複数パターンでテストしよう",
      description: "異なる文言のテンプレートを複数作成し、どれが効果的か比較できます。"
    },
    {
      title: "配信ごとに内容を変えられる",
      description: "通知が来たら「編集して投稿」を選択すれば、その場で内容を編集できます。"
    },
  ];

  return (
    <PageLayout>
      {/* 構造化データ（HowTo） */}
      <HowToSchema />

      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              使い方
            </h1>
            <p className="text-xl text-neutral-sub leading-relaxed">
              たった4ステップで、告知忘れの機会損失をゼロに。<br />
              セットアップは10分以内に完了します。
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
              無料で今すぐ使い始められます。
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
