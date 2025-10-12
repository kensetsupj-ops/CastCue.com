import PageLayout from "@/components/PageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記｜CastCue",
  description: "CastCueの特定商取引法に基づく表記。",
};

export default function LegalPage() {
  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              特定商取引法に基づく表記
            </h1>
            <p className="text-body text-neutral-sub">
              最終更新日：2025年9月1日
            </p>
          </div>
        </div>
      </section>

      {/* Legal Content */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-body text-neutral-sub leading-relaxed">
                ※現在は招待制ベータ版として無料提供中のため、販売は行っておりません。
                <br />
                正式リリース後、本ページを更新いたします。
              </p>
            </div>

            <div className="space-y-6">
              <div className="border-b border-neutral-border pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  サービス名称
                </h3>
                <p className="text-body text-neutral-sub">
                  CastCue（キャストキュー）
                </p>
              </div>

              <div className="border-b border-neutral-border pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  運営者
                </h3>
                <p className="text-body text-neutral-sub">
                  CastCue運営事務局
                  <br />
                  ※個人開発のため、詳細は正式リリース時に公開予定
                </p>
              </div>

              <div className="border-b border-neutral-border pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  所在地
                </h3>
                <p className="text-body text-neutral-sub">
                  東京都
                  <br />
                  ※詳細住所は正式リリース時に公開予定
                </p>
              </div>

              <div className="border-b border-neutral-border pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  お問い合わせ
                </h3>
                <p className="text-body text-neutral-sub">
                  メール：
                  <a
                    href="mailto:support@castcue.com"
                    className="text-primary hover:text-primary-hover underline underline-offset-4"
                  >
                    support@castcue.com
                  </a>
                  <br />
                  営業時間：平日 10:00 - 18:00（土日祝日を除く）
                </p>
              </div>

              <div className="border-b border-neutral-border pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  販売価格
                </h3>
                <p className="text-body text-neutral-sub">
                  現在：無料（招待制ベータ版）
                  <br />
                  正式版：月額500円〜1,000円程度を予定
                  <br />
                  ※正式な価格は決定次第お知らせします
                </p>
              </div>

              <div className="border-b border-neutral-border pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  支払方法
                </h3>
                <p className="text-body text-neutral-sub">
                  正式リリース時に以下を予定：
                  <br />
                  ・クレジットカード決済
                  <br />
                  ※詳細は正式リリース時に公開
                </p>
              </div>

              <div className="border-b border-neutral-border pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  サービス提供時期
                </h3>
                <p className="text-body text-neutral-sub">
                  登録完了後、即時利用可能
                </p>
              </div>

              <div className="border-b border-neutral-border pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  返金・キャンセルについて
                </h3>
                <p className="text-body text-neutral-sub">
                  正式リリース後の返金・キャンセルポリシーについては、
                  <br />
                  正式リリース時に公開予定です。
                </p>
              </div>

              <div className="pb-6">
                <h3 className="text-h3 font-bold text-neutral-ink mb-2">
                  その他
                </h3>
                <p className="text-body text-neutral-sub">
                  本サービスに関する詳細は、
                  <a href="/terms" className="text-primary hover:text-primary-hover underline underline-offset-4">
                    利用規約
                  </a>
                  および
                  <a href="/privacy" className="text-primary hover:text-primary-hover underline underline-offset-4">
                    プライバシーポリシー
                  </a>
                  をご確認ください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
