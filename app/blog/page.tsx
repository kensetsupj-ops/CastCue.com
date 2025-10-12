import PageLayout from "@/components/PageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ブログ｜CastCue",
  description: "CastCueの開発状況や配信者向けのTipsなど、様々な情報を発信します。",
};

export default function BlogPage() {
  return (
    <PageLayout>
      <section className="py-32">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              ブログ
            </h1>
            <p className="text-xl text-neutral-sub">
              Coming Soon...
            </p>
            <p className="text-body text-neutral-sub">
              CastCueの開発状況や配信者向けのTipsなど、様々な情報を発信予定です。
              <br />
              公開までもうしばらくお待ちください。
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
