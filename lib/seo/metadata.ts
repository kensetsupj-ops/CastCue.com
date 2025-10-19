import { Metadata } from "next";

/**
 * SEOメタデータ設定
 *
 * このファイルはCastCueの全ページで使用されるSEOメタデータを一元管理します。
 * Google検索で競合サービスを上回るために最適化されています。
 */

// サイト共通設定
export const SITE_CONFIG = {
  name: "CastCue",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://castcue.vercel.app",
  ogImage: "/icon-192x192.png", // 暫定: 既存のアイコンを使用（OGP専用画像は後で追加）
  twitterCard: "/icon-192x192.png", // 暫定: 既存のアイコンを使用（Twitter Card専用画像は後で追加）
  locale: "ja_JP",
  themeColor: "#0070f3",
} as const;

// トップページメタデータ
export const homeMetadata: Metadata = {
  title: "CastCue - Twitch配信開始を自動ツイート | 配信通知を自動化",
  description: "Twitch配信開始を自動ツイート・ポスト。配信の自動ツイートで告知忘れゼロ。TwitchとX(Twitter)の連携で配信開始通知を完全自動化。便利な配信者向けツール。",
  keywords: [
    "Twitch",
    "配信開始",
    "自動",
    "ポスト",
    "ツイート",
    "ツール",
    "Twitch 自動ツイート",
    "配信 自動ツイート",
    "配信開始 ツイート",
    "Twitch 配信開始 通知",
    "Twitch X 連携",
    "Twitch Twitter 自動投稿",
    "配信通知",
    "X",
    "Twitter",
    "自動投稿",
    "配信者",
  ],
  authors: [{ name: "CastCue Team" }],
  creator: "CastCue",
  publisher: "CastCue",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: SITE_CONFIG.locale,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: "CastCue - Twitch配信開始を自動ツイート | 配信通知を自動化",
    description: "Twitch配信開始を自動ツイート・ポスト。TwitchとX(Twitter)の連携で配信開始通知を完全自動化。便利な配信者向けツール。",
    images: [
      {
        url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`,
        width: 192,
        height: 192,
        alt: "CastCue - Twitch配信開始を自動ツイート | 配信通知を自動化",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CastCue - Twitch配信開始を自動ツイート",
    description: "配信の自動ツイート・ポストで告知忘れゼロ。TwitchとX連携で配信開始通知を完全自動化。",
    images: [`${SITE_CONFIG.url}${SITE_CONFIG.twitterCard}`],
    creator: "@castcue",
    site: "@castcue",
  },
  alternates: {
    canonical: SITE_CONFIG.url,
    // 多言語対応は将来実装予定（現在は日本語のみ）
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

// 機能ページメタデータ
export const featuresMetadata: Metadata = {
  title: "機能 - CastCue",
  description: "CastCueの主要機能：配信開始の自動検知、カスタマイズ可能なテンプレート、視聴者数トラッキング、詳細な分析レポート。配信者のSNSマーケティングを完全自動化。",
  openGraph: {
    title: "機能 - CastCue",
    description: "配信開始の自動検知、カスタマイズ可能なテンプレート、視聴者数トラッキング、詳細な分析レポート。",
    url: `${SITE_CONFIG.url}/features`,
    images: [{ url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}` }],
  },
  twitter: {
    title: "機能 - CastCue",
    description: "配信開始の自動検知、テンプレート、視聴者数トラッキング、分析レポート。",
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/features`,
  },
};

// 料金ページメタデータ
export const pricingMetadata: Metadata = {
  title: "料金 - CastCue",
  description: "CastCueの料金プラン。クレジットカード不要、30秒で登録完了。",
  openGraph: {
    title: "料金 - CastCue",
    description: "CastCueの料金プラン。",
    url: `${SITE_CONFIG.url}/pricing`,
    images: [{ url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}` }],
  },
  twitter: {
    title: "料金 - CastCue",
    description: "CastCueの料金プラン。",
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/pricing`,
  },
};

// 使い方ページメタデータ
export const howToUseMetadata: Metadata = {
  title: "使い方 - CastCue",
  description: "CastCueの使い方：3ステップで簡単セットアップ。TwitchとX(Twitter)を連携し、テンプレートを設定するだけで、配信開始を自動で通知。",
  openGraph: {
    title: "使い方 - CastCue",
    description: "3ステップで簡単セットアップ。TwitchとX(Twitter)を連携し、テンプレートを設定するだけ。",
    url: `${SITE_CONFIG.url}/how-to-use`,
    images: [{ url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}` }],
  },
  twitter: {
    title: "使い方 - CastCue",
    description: "3ステップで簡単セットアップ。",
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/how-to-use`,
  },
};

// FAQページメタデータ
export const faqMetadata: Metadata = {
  title: "よくある質問（FAQ） - CastCue",
  description: "CastCueについてよくある質問。料金、使い方、設定方法、効果測定など、配信者の疑問にお答えします。",
  openGraph: {
    title: "よくある質問（FAQ） - CastCue",
    description: "料金、使い方、設定方法、効果測定など、配信者の疑問にお答えします。",
    url: `${SITE_CONFIG.url}/faq`,
    images: [{ url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}` }],
  },
  twitter: {
    title: "よくある質問（FAQ） - CastCue",
    description: "料金、使い方、設定方法、効果測定など、配信者の疑問にお答えします。",
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/faq`,
  },
};

// Aboutページメタデータ
export const aboutMetadata: Metadata = {
  title: "About - CastCue",
  description: "CastCueは配信者のSNSマーケティングを自動化するサービスです。配信開始の告知忘れをゼロにし、効果を可視化します。",
  openGraph: {
    title: "About - CastCue",
    description: "配信者のSNSマーケティングを自動化するサービス。",
    url: `${SITE_CONFIG.url}/about`,
    images: [{ url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}` }],
  },
  twitter: {
    title: "About - CastCue",
    description: "配信者のSNSマーケティングを自動化するサービス。",
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/about`,
  },
};
