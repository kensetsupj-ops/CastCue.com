import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン｜CastCue",
  description: "CastCueにログインして、配信告知を自動化しましょう。",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
