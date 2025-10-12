# CastCue 開発ドキュメント

## 概要
CastCueは、Twitchストリーマー向けの配信通知自動化ツールです。
配信開始時に自動でX（Twitter）に投稿し、視聴者数の増加（リフト効果）を測定します。

## ドキュメント一覧

### セットアップ
- [環境構築ガイド](./setup/environment.md) - 初回セットアップ手順
- [環境変数設定](./setup/env-variables.md) - .env.local の設定方法
- [外部サービス設定](./setup/external-services.md) - Twitch/X/Supabase の設定

### API仕様
- [X (Twitter) API](./api/x-api.md) - X OAuth と投稿API の使用方法
- [Twitch API](./api/twitch-api.md) - EventSub と Stream API
- [内部API](./api/internal-api.md) - 実装したエンドポイント一覧

### データベース
- [スキーマ定義](./database/schema.md) - テーブル構造とリレーション
- [RLS ポリシー](./database/rls-policies.md) - Row Level Security 設定

### アーキテクチャ
- [システム構成](./architecture/system-overview.md) - 全体アーキテクチャ
- [データフロー](./architecture/data-flow.md) - データの流れと処理フロー
- [セキュリティ](./architecture/security.md) - 暗号化とセキュリティ対策

### 開発ガイド
- [ローカル開発](./development/local-development.md) - 開発環境での作業方法
- [テスト手順](./development/testing.md) - 機能テストの方法
- [トラブルシューティング](./development/troubleshooting.md) - よくある問題と解決策

## クイックスタート

1. リポジトリをクローン
2. `npm install` で依存関係をインストール
3. `.env.local` を設定（[環境変数設定](./setup/env-variables.md)参照）
4. Supabase でテーブルを作成（[スキーマ定義](./database/schema.md)参照）
5. `npm run dev` で開発サーバー起動

## 主要機能

- ✅ Twitch EventSub (stream.online) webhook 実装
- ✅ Web Push 通知システム (VAPID + Service Worker)
- ✅ X OAuth2 認証フロー
- ✅ X 投稿 API 連携
- ✅ 短縮 URL 生成とクリック計測
- ✅ 同接サンプリングとリフト算出

## 技術スタック

- **フレームワーク**: Next.js 15.5.4 (App Router)
- **認証**: Supabase Auth
- **データベース**: PostgreSQL (Supabase)
- **デプロイ**: Vercel (推奨)
- **外部API**: Twitch API, X API v2
