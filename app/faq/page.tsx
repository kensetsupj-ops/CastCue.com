import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "よくある質問｜CastCue",
  description: "CastCueについてよくいただく質問とその回答をまとめました。",
};

export default function FAQPage() {
  const faqs = [
    {
      category: "基本的な使い方",
      questions: [
        {
          q: "配信の度に設定が必要ですか？",
          a: "不要です。初回にTwitchとXを接続し、テンプレートを登録すれば、あとは配信するだけで自動で動きます。"
        },
        {
          q: "投稿内容は編集できますか？",
          a: "できます。配信開始時にブラウザ通知が届くので、「そのまま投稿」または「編集して投稿」を選べます。編集画面では、過去に効果が高かった文面も表示されるので、それを参考に微調整することもできます。また、設定で「未操作時の挙動」を選べるので、自動投稿（完全お任せ）またはスキップ（投稿しない）のどちらかを選択できます。"
        },
        {
          q: "通知に気づかなかったらどうなりますか？",
          a: "設定で「未操作時の挙動」を選べます。「自動投稿」に設定すれば、猶予時間後に自動で投稿されます。「スキップ」に設定すれば、何もせず記録だけ残ります。猶予時間は30秒〜120秒で自由に設定できます。"
        },
        {
          q: "配信が終わったら何か設定が必要ですか？",
          a: "不要です。CastCueは配信の開始を検知して告知しますが、配信終了後に特別な操作は必要ありません。視聴者数のサンプリングは自動で終了し、ダッシュボードで効果を確認できる状態になります。"
        },
        {
          q: "告知を忘れたらどうなりますか？",
          a: "CastCueは配信開始を自動で検知するので、忘れることはありません。必ずブラウザ通知が届きます。完全自動モードにすれば、通知を見逃しても自動で投稿されます。"
        },
        {
          q: "どのプラットフォームに対応していますか？",
          a: "現在はTwitchの配信検知とXへの自動ツイートに対応しています。YouTubeやTikTokは今後の予定です。"
        },
      ]
    },
    {
      category: "料金・プラン",
      questions: [
        {
          q: "本当に無料ですか？",
          a: "はい、現在はベータ版として完全無料でご利用いただけます。"
        },
        {
          q: "ベータ版はいつまで無料ですか？",
          a: "正式リリース後も、ベータ版参加者には特別価格を提供予定です。詳細は決まり次第お知らせします。"
        },
        {
          q: "正式版リリース後の料金はいくらですか？",
          a: "現在検討中ですが、月額500円〜1,000円程度を想定しています。ベータ版参加者には特別割引を提供予定です。"
        },
      ]
    },
    {
      category: "機能について",
      questions: [
        {
          q: "配信開始の検知はどのくらい早いですか？",
          a: "配信開始から平均30秒以内にブラウザ通知が届きます。"
        },
        {
          q: "ツイート内容をカスタマイズできますか？",
          a: "はい、テンプレートを作成して自由にカスタマイズできます。配信タイトルやURLを自動挿入する変数機能も利用可能です。"
        },
        {
          q: "複数のツイートパターンをテストできますか？",
          a: "はい、複数のテンプレートを作成して、どれが効果的か比較できます。"
        },
        {
          q: "効果測定はどのように確認できますか？",
          a: "ダッシュボードで視聴者数の推移をグラフで確認できます。告知前後での視聴者増加数などを数値で確認できます。"
        },
      ]
    },
    {
      category: "セキュリティ・プライバシー",
      questions: [
        {
          q: "アカウント情報は安全ですか？",
          a: "はい、アクセストークンは暗号化して保存され、必要最小限の権限のみを要求します。SSL/TLS通信で保護されています。"
        },
        {
          q: "どのような権限が必要ですか？",
          a: "Twitchは配信情報の読み取り権限、Xはツイート投稿権限のみです。DMの閲覧やフォロワー情報などは要求しません。"
        },
        {
          q: "連携を解除できますか？",
          a: "はい、いつでも設定画面から連携を解除できます。解除後はデータも削除されます。"
        },
      ]
    },
    {
      category: "トラブルシューティング",
      questions: [
        {
          q: "通知が届きません",
          a: "以下を確認してください：1) ブラウザの通知許可が有効か、2) TwitchとXが正しく連携されているか、3) テンプレートが作成されているか。それでも解決しない場合は、サポートにお問い合わせください。"
        },
        {
          q: "連携エラーが表示されます",
          a: "アクセストークンの有効期限が切れている可能性があります。設定画面から再度連携をお試しください。"
        },
        {
          q: "サポートに問い合わせる方法は？",
          a: "お問い合わせページから、またはベータ版参加者用のDiscordサーバーでサポートを受けられます。"
        },
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
              よくある質問
            </h1>
            <p className="text-xl text-neutral-sub leading-relaxed">
              CastCueについてよく寄せられる質問にお答えします。
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-16">
            {faqs.map((category, catIndex) => (
              <div key={catIndex} className="space-y-8">
                <h2 className="text-3xl font-bold text-neutral-ink pb-4 border-b-2 border-primary/20">
                  {category.category}
                </h2>
                <div className="space-y-6">
                  {category.questions.map((faq, index) => (
                    <Card key={index} className="border-neutral-border hover:border-primary/30 transition-colors">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="text-h3 font-bold text-neutral-ink">
                          Q: {faq.q}
                        </h3>
                        <p className="text-body text-neutral-sub leading-relaxed pl-6">
                          A: {faq.a}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="border-t border-neutral-border bg-neutral-bg py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold text-neutral-ink">
              その他のご質問
            </h2>
            <p className="text-body text-neutral-sub">
              上記で解決しない場合は、お気軽にお問い合わせください。
            </p>
            <a
              href="/contact"
              className="inline-block text-primary hover:text-primary-hover underline underline-offset-4 font-medium"
            >
              お問い合わせはこちら →
            </a>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
