import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About｜CastCue",
  description: "配信者が配信に集中できる世界を目指して。CastCueのミッションと価値観をご紹介します。",
};

export default function AboutPage() {
  const values = [
    {
      title: "配信者ファースト",
      description: "配信者の方々の声を最優先に、本当に必要な機能を開発しています。"
    },
    {
      title: "シンプルで使いやすく",
      description: "複雑な設定は不要。誰でも簡単に使える設計を心がけています。"
    },
    {
      title: "透明性のある開発",
      description: "ベータ版参加者と一緒に、オープンに開発を進めています。"
    },
  ];

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              About CastCue
            </h1>
            <p className="text-xl text-neutral-sub leading-relaxed">
              配信者が配信に集中できる世界を目指して
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-neutral-ink">
                私たちのミッション
              </h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                CastCueは、配信者の方々が「配信」という本質的な活動に集中できるよう、告知作業を自動化するツールです。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                「配信開始の告知を忘れた」「手動でツイートする時間がない」「告知の効果がわからない」—— そんな配信者の悩みを解決するために、CastCueは生まれました。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                配信者の皆さんが、告知作業から解放され、より良いコンテンツ作りに時間を使えるよう。
                私たちはそんな世界を目指しています。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="border-t border-neutral-border bg-neutral-bg py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-4xl font-bold text-neutral-ink text-center">
              私たちの価値観
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {values.map((value, index) => (
                <Card key={index} className="border-neutral-border">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-h3 font-bold text-neutral-ink">
                      {value.title}
                    </h3>
                    <p className="text-body text-neutral-sub leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="border-t border-neutral-border py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-neutral-ink">
                開発の背景
              </h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                開発者の友人が配信者であり、「配信開始の告知を忘れて視聴者が集まらなかった」という困った声を聴いたことから、CastCueの開発が始まりました。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                「自動化できないだろうか？」という単純な疑問が、このプロジェクトのスタートでした。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                現在は招待制ベータ版として、配信者の方々と一緒に開発を進めています。
                皆さんのフィードバックをもとに、日々改善を重ねています。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t border-neutral-border bg-neutral-bg py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold text-neutral-ink">
              一緒に作りませんか？
            </h2>
            <p className="text-body text-neutral-sub">
              ベータ版に参加して、あなたの声をCastCueに反映させてください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/login"
                className="inline-block px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-md transition-colors"
              >
                無料で始める
              </a>
              <a
                href="/contact"
                className="inline-block px-6 py-3 border-2 border-neutral-border hover:border-primary text-neutral-ink font-medium rounded-md transition-colors"
              >
                お問い合わせ
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
