import PageLayout from "@/components/PageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜CastCue",
  description: "CastCueのプライバシーポリシー。個人情報の取り扱いについて説明しています。",
};

export default function PrivacyPage() {
  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              プライバシーポリシー
            </h1>
            <p className="text-body text-neutral-sub">
              最終更新日：2025年9月1日
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto prose prose-neutral max-w-none space-y-12">
            <div className="space-y-4">
              <p className="text-body text-neutral-sub leading-relaxed">
                CastCue（以下「当サービス」といいます）は、ユーザーの個人情報保護を重要視し、以下の方針に基づいて個人情報を取り扱います。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">1. 収集する情報</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、以下の情報を収集します。
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-neutral-sub ml-4">
                <li>Twitchアカウント情報（ユーザー名、配信情報等）</li>
                <li>X（Twitter）アカウント情報（ユーザー名、アクセストークン等）</li>
                <li>サービス利用状況（ログイン履歴、機能利用履歴等）</li>
                <li>お問い合わせ内容</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">2. 情報の利用目的</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                収集した情報は、以下の目的で利用します。
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-neutral-sub ml-4">
                <li>サービスの提供・運営のため</li>
                <li>ユーザーサポートのため</li>
                <li>サービスの改善・新機能開発のため</li>
                <li>利用規約違反の対応のため</li>
                <li>重要なお知らせの配信のため</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">3. 情報の管理</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、収集した個人情報を適切に管理し、以下の対策を講じています。
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-neutral-sub ml-4">
                <li>アクセストークンは暗号化して保存</li>
                <li>SSL/TLS通信による通信の暗号化</li>
                <li>不正アクセス防止のためのセキュリティ対策</li>
                <li>定期的なセキュリティ監査</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">4. 第三者への提供</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、以下の場合を除き、ユーザーの同意なく第三者に個人情報を提供しません。
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-neutral-sub ml-4">
                <li>法令に基づく場合</li>
                <li>人の生命、身体または財産の保護のために必要な場合</li>
                <li>公衆衛生の向上または児童の健全な育成の推進のために必要な場合</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">5. 連携サービスについて</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、TwitchおよびX（Twitter）と連携してサービスを提供します。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                これらの連携サービスに関する情報の取り扱いは、各サービスのプライバシーポリシーに従います。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">6. Cookieについて</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、サービスの利便性向上のためにCookieを使用します。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                ブラウザの設定によりCookieを無効にすることもできますが、一部機能が利用できなくなる可能性があります。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">7. アクセス解析ツール</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、サービス改善のため、Google Analyticsなどのアクセス解析ツールを使用することがあります。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                これらのツールによる情報収集については、各ツールのプライバシーポリシーをご確認ください。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">8. 個人情報の開示・訂正・削除</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                ユーザーは、自己の個人情報について、開示、訂正、削除を求めることができます。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                ご希望の場合は、お問い合わせフォームよりご連絡ください。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">9. プライバシーポリシーの変更</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、必要に応じて本ポリシーを変更することがあります。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                変更後のポリシーは、当サービス上に掲載した時点で効力を生じるものとします。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">10. お問い合わせ</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
              </p>
              <p className="text-body text-neutral-sub">
                メール：
                <a
                  href="mailto:support@castcue.com"
                  className="text-primary hover:text-primary-hover underline underline-offset-4"
                >
                  support@castcue.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
