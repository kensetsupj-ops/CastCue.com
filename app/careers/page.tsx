import PageLayout from "@/components/PageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "採用情報｜CastCue",
  description: "CastCueのチームメンバー募集情報。正式リリース後、チームメンバーを募集予定です。",
};

export default function CareersPage() {
  return (
    <PageLayout>
      <section className="py-32">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              採用情報
            </h1>
            <p className="text-xl text-neutral-sub">
              Coming Soon...
            </p>
            <p className="text-body text-neutral-sub">
              現在、CastCueは招待制ベータ版として開発中です。
              <br />
              正式リリース後、チームメンバーを募集予定です。
            </p>
            <p className="text-small text-neutral-sub">
              興味のある方は、
              <a href="/contact" className="text-primary hover:text-primary-hover underline underline-offset-4">
                お問い合わせ
              </a>
              からご連絡ください。
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
