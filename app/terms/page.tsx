import PageLayout from "@/components/PageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約｜CastCue",
  description: "CastCueの利用規約。サービスの利用条件を定めています。",
};

export default function TermsPage() {
  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              利用規約
            </h1>
            <p className="text-body text-neutral-sub">
              最終更新日：2025年9月1日
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto prose prose-neutral max-w-none space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第1条（適用）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                本利用規約（以下「本規約」といいます）は、CastCue（以下「当サービス」といいます）の利用条件を定めるものです。
                ユーザーは、本規約に同意した上で当サービスを利用するものとします。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第2条（定義）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                本規約において使用する用語の定義は、以下の通りとします。
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-neutral-sub ml-4">
                <li>「当サービス」とは、CastCueが提供する配信告知自動化サービスを指します。</li>
                <li>「ユーザー」とは、当サービスを利用する全ての方を指します。</li>
                <li>「連携サービス」とは、TwitchおよびX（Twitter）等、当サービスと連携する外部サービスを指します。</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第3条（登録）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスの利用を希望する方は、本規約に同意の上、所定の方法で登録を行うものとします。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                登録完了時点で、ユーザーと当サービスの間に利用契約が成立するものとします。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第4条（アカウント管理）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                ユーザーは、自己の責任において、当サービスに登録したアカウント情報を適切に管理するものとします。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                アカウント情報の管理不十分により生じた損害について、当サービスは一切の責任を負いません。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第5条（禁止事項）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                ユーザーは、当サービスの利用にあたり、以下の行為を行ってはならないものとします。
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-neutral-sub ml-4">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>当サービスの運営を妨害する行為</li>
                <li>他のユーザーに対する嫌がらせや誹謗中傷</li>
                <li>当サービスのサーバーやネットワークに過度な負荷をかける行為</li>
                <li>不正アクセスまたは不正アクセスを試みる行為</li>
                <li>その他、当サービスが不適切と判断する行為</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第6条（サービスの停止・変更）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、メンテナンスや障害対応のため、予告なくサービスを一時停止または変更することがあります。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                これにより生じた損害について、当サービスは一切の責任を負いません。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第7条（免責事項）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、提供するサービスについて、正確性、完全性、有用性等を保証するものではありません。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスの利用により生じた損害について、当サービスは一切の責任を負いません。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第8条（規約の変更）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスは、必要に応じて本規約を変更することがあります。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                変更後の規約は、当サービス上に掲載した時点で効力を生じるものとします。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-neutral-ink">第9条（準拠法・管轄裁判所）</h2>
              <p className="text-body text-neutral-sub leading-relaxed">
                本規約の解釈にあたっては、日本法を準拠法とします。
              </p>
              <p className="text-body text-neutral-sub leading-relaxed">
                当サービスに関して紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
