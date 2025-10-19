/**
 * 構造化データ（JSON-LD）コンポーネント
 *
 * Google検索でリッチスニペット表示を獲得するための構造化データを提供します。
 * schema.orgの仕様に準拠しています。
 */

import { SITE_CONFIG } from "./metadata";

// SoftwareApplication 構造化データ
export function SoftwareApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CastCue",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "Marketing Automation",
    "operatingSystem": "Web",
    "url": SITE_CONFIG.url,
    "description": "Twitch配信開始を自動でX(Twitter)に通知するツール。配信者のSNSマーケティングを自動化し、効果を可視化します。",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2026-12-31",
    },
    // aggregateRating: 実測データがないため削除（将来的に追加予定）
    "featureList": [
      "配信開始の自動検知",
      "X(Twitter)への自動投稿",
      "カスタマイズ可能なテンプレート",
      "視聴者数トラッキング",
      "詳細な分析レポート",
      "複数パターンのA/Bテスト",
      "リアルタイムダッシュボード",
    ],
    // screenshot: 画像未作成のため削除（将来的に追加予定）
    "softwareVersion": "1.0.0",
    "datePublished": "2025-01-01",
    "creator": {
      "@type": "Organization",
      "name": "CastCue Team",
      "url": SITE_CONFIG.url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQPage 構造化データ
export function FAQPageSchema() {
  const faqs = [
    {
      question: "CastCueは無料で使えますか？",
      answer: "はい、基本機能は完全無料です。月12回までの投稿が無料で利用できます。クレジットカード登録も不要です。",
    },
    {
      question: "配信の度に設定が必要ですか？",
      answer: "不要です。初回にTwitchとXを接続し、テンプレートを登録すれば、あとは配信するだけで自動で動きます。",
    },
    {
      question: "投稿内容は編集できますか？",
      answer: "できます。配信開始時にブラウザ通知が届くので、「そのまま投稿」または「編集して投稿」を選べます。編集画面では、過去に効果が高かった文面も表示されるので、それを参考に微調整することもできます。",
    },
    {
      question: "通知に気づかなかったらどうなりますか？",
      answer: "設定で「未操作時の挙動」を選べます。「自動投稿」に設定すれば、猶予時間後に自動で投稿されます。「スキップ」に設定すれば、何もせず記録だけ残ります。猶予時間は30秒〜120秒で自由に設定できます。",
    },
    {
      question: "投稿の効果は分かりますか？",
      answer: "はい、分かります。告知後の視聴者増加数（呼べた人数）やクリック数を自動追跡し、ダッシュボードで確認できます。Twitchダッシュボードでは見えない「配信前のマーケティング」効果を可視化します。",
    },
    {
      question: "YouTubeやTikTokには対応していますか？",
      answer: "現在はTwitch専用です。他プラットフォームは今後の予定です。",
    },
    {
      question: "どのくらいで配信開始を検知しますか？",
      answer: "配信開始から平均30秒以内に検知し、ブラウザ通知を送信します。",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Organization 構造化データ
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CastCue",
    "url": SITE_CONFIG.url,
    // logo: ロゴ画像未作成のため削除（将来的に追加予定）
    "description": "配信者のSNSマーケティングを自動化するサービス。Twitch配信開始を自動でX(Twitter)に通知し、効果を可視化します。",
    "foundingDate": "2025",
    // sameAs: SNSアカウント未作成のため削除（将来的に追加予定）
    // contactPoint: サポートメール未設定のため削除（将来的に追加予定）
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// BreadcrumbList 構造化データ（動的生成用）
export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// HowTo 構造化データ（使い方ページ用）
export function HowToSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "CastCueの使い方 - Twitch配信開始を自動でX(Twitter)に通知する方法",
    "description": "CastCueを使ってTwitch配信開始を自動でX(Twitter)に通知する3ステップの簡単な設定方法。",
    // image: 画像未作成のため削除（将来的に追加予定）
    "totalTime": "PT3M",
    "estimatedCost": {
      "@type": "MonetaryAmount",
      "currency": "JPY",
      "value": "0",
    },
    "tool": [
      {
        "@type": "HowToTool",
        "name": "Twitchアカウント",
      },
      {
        "@type": "HowToTool",
        "name": "X(Twitter)アカウント",
      },
    ],
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "TwitchとXを連携",
        "text": "CastCueにログインし、TwitchアカウントとX(Twitter)アカウントを接続します。",
        "url": `${SITE_CONFIG.url}/how-to-use#step1`,
        // image: 画像未作成のため削除（将来的に追加予定）
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "テンプレートを設定",
        "text": "配信開始時に投稿する文面のテンプレートを作成します。複数パターンを登録して効果を比較できます。",
        "url": `${SITE_CONFIG.url}/how-to-use#step2`,
        // image: 画像未作成のため削除（将来的に追加予定）
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "配信を開始",
        "text": "あとは普段通りTwitchで配信を始めるだけ。配信開始を自動検知し、ブラウザ通知が届きます。",
        "url": `${SITE_CONFIG.url}/how-to-use#step3`,
        // image: 画像未作成のため削除（将来的に追加予定）
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// WebSite 構造化データ（サイト検索用）
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "CastCue",
    "url": SITE_CONFIG.url,
    "description": "Twitch配信開始を自動でX(Twitter)に通知するツール。配信者のSNSマーケティングを自動化。",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
