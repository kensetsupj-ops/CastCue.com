import { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ｜CastCue",
  description: "CastCueへのお問い合わせ。ご質問、ご要望、不具合報告など、お気軽にお問い合わせください。",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
