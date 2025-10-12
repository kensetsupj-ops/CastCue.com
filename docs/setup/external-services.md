# 外部サービス設定ガイド

## 1. Supabase セットアップ

### プロジェクト作成
1. https://supabase.com にアクセス
2. 「New Project」をクリック
3. Organization を選択または新規作成
4. プロジェクト名: `castcue`
5. Database Password を設定（安全な場所に保存）
6. Region: 日本の場合は `Northeast Asia (Tokyo)`

### テーブル作成
SQL Editorで以下を実行（詳細は [database/schema.md](../database/schema.md) 参照）:

```sql
-- 基本的なテーブル作成スクリプト
-- 完全版は docs/database/schema.md を参照
```

### 認証設定
1. Authentication → Providers
2. Email を有効化
3. Site URL: `http://localhost:3000` を追加
4. Redirect URLs:
   - `http://localhost:3000/**`
   - 本番環境では `https://castcue.com/**` も追加

## 2. Twitch Developer セットアップ

### アプリケーション登録

1. **Twitchアカウントでログイン**
   - https://dev.twitch.tv/console にアクセス
   - Twitchアカウントでログイン（2FA推奨）

2. **新規アプリ登録**
   - 「Register Your Application」をクリック
   - Name: `CastCue Development`
   - OAuth Redirect URLs: `http://localhost:3000/api/twitch/oauth/callback`
   - Category: `Application Integration`
   - 「Create」をクリック

3. **認証情報取得**
   - 作成したアプリをクリック
   - 「New Secret」で Client Secret を生成
   - Client ID と Client Secret を `.env.local` に設定

### EventSub Webhook設定

**ローカル開発環境:**
- ngrokまたはCloudflare Tunnelが必要
- Webhook URL: `https://your-tunnel.ngrok.io/api/twitch/webhook`

**本番環境:**
- Webhook URL: `https://castcue.com/api/twitch/webhook`
- SSL必須（Let's Encryptなど）

### 必要な権限（スコープ）
現在の実装では以下のスコープは不要ですが、将来的な拡張用:
- (将来) `user:read:email`
- (将来) `channel:read:subscriptions`

## 3. X (Twitter) Developer セットアップ

### Developer Portal 登録

1. **アカウント作成**
   - https://developer.twitter.com にアクセス
   - Twitterアカウントでログイン
   - Developer Portalへのアクセスを申請

2. **アプリケーション作成**
   - Dashboard → Projects & Apps → Create App
   - App name: `CastCue Development`
   - App description: (申請内容を参照)

### User Authentication Settings

1. **Settings → User authentication settings → Set up**

2. **App permissions:**
   - ✅ Read and write (ツイート投稿に必要)

3. **Type of App:**
   - ✅ Web App

4. **App info:**
   - Callback URI / Redirect URL:
     - 開発: `https://dev.castcue.com/api/x/oauth/callback`
     - 本番: `https://castcue.com/api/x/oauth/callback`
   - Website URL:
     - 開発: `https://dev.castcue.com`
     - 本番: `https://castcue.com`

   **注意:** `localhost` は使用できないため、開発環境では:
   - Vercelにデプロイして `dev.castcue.com` を使用
   - または Cloudflare Tunnel で `dev.castcue.com` に紐付け

5. **OAuth 2.0 settings:**
   - ✅ Enable OAuth 2.0
   - ✅ Request email address (オプション)

### Keys and Tokens

1. **OAuth 2.0 Client ID and Secret:**
   - Keys and tokens タブ
   - OAuth 2.0 Client ID をコピー → `X_CLIENT_ID`
   - Client Secret をコピー → `X_CLIENT_SECRET`

### API Access Level

1. **Free Tier (開発用):**
   - 月間 1,500 ツイート
   - 開発とテストには十分

2. **Basic Tier (本番推奨):**
   - $100/月
   - 月間 3,000 ツイート
   - より高いレート制限

## 4. Vercel デプロイ（開発環境用）

### 初回デプロイ

```bash
# Vercel CLIインストール
npm install -g vercel

# デプロイ
vercel

# プロンプトに従って設定:
# - Set up and deploy? Yes
# - Which scope? (個人アカウント選択)
# - Link to existing project? No
# - Project name: castcue-dev
# - In which directory is your code located? ./
# - Want to override settings? No
```

### 環境変数設定

1. **Vercel Dashboard:**
   - https://vercel.com/dashboard
   - プロジェクト選択 → Settings → Environment Variables

2. **すべての環境変数を追加:**
   - `.env.local` の内容をコピー
   - `APP_ORIGIN` と `NEXT_PUBLIC_SITE_URL` は Vercel URL に変更
   - Production, Preview, Development すべてにチェック

3. **再デプロイ:**
   ```bash
   vercel --prod
   ```

### カスタムドメイン設定

1. **Vercel Dashboard:**
   - Settings → Domains
   - 「Add」をクリック
   - `dev.castcue.com` を入力

2. **DNS設定 (CastCue.comのプロバイダーで):**
   - Type: `CNAME`
   - Name: `dev`
   - Value: `cname.vercel-dns.com`

3. **確認:**
   - 数分〜数時間でSSL証明書が自動発行される
   - `https://dev.castcue.com` でアクセス可能

## 5. Cloudflare Tunnel（代替方法）

ローカル開発環境を公開URLに紐付ける場合:

### セットアップ

```bash
# Cloudflared インストール
npm install -g cloudflared

# Cloudflare ログイン
cloudflared tunnel login

# トンネル作成
cloudflared tunnel create castcue-dev

# 設定ファイル作成 (~/.cloudflared/config.yml)
tunnel: <TUNNEL-ID>
credentials-file: ~/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: dev.castcue.com
    service: http://localhost:3000
  - service: http_status:404

# DNS ルート追加
cloudflared tunnel route dns castcue-dev dev.castcue.com

# トンネル起動
cloudflared tunnel run castcue-dev
```

### 使用方法

```bash
# ターミナル1: Next.js起動
npm run dev

# ターミナル2: Tunnel起動
cloudflared tunnel run castcue-dev
```

これで `https://dev.castcue.com` でローカル環境にアクセス可能。

## セットアップ確認チェックリスト

- [ ] Supabase プロジェクト作成
- [ ] Supabase テーブル作成
- [ ] Twitch アプリ登録
- [ ] Twitch Client ID/Secret 取得
- [ ] X Developer Portal 登録承認
- [ ] X アプリ作成
- [ ] X OAuth 2.0 設定
- [ ] Vercel デプロイ（または Cloudflare Tunnel設定）
- [ ] カスタムドメイン設定（dev.castcue.com）
- [ ] すべての環境変数設定
- [ ] 動作確認（認証フローテスト）

## トラブルシューティング

### Twitch Webhook が届かない
- ngrok/Cloudflare Tunnel が起動しているか確認
- Webhook URL が正しいか確認
- TWITCH_WEBHOOK_SECRET が設定されているか確認

### X OAuth が失敗する
- Callback URI が完全一致しているか確認（ポート番号含む）
- OAuth 2.0 が有効化されているか確認
- App permissions が Read and write になっているか確認

### Vercel デプロイエラー
- 環境変数がすべて設定されているか確認
- ビルドログでエラー内容を確認
- `vercel logs` でランタイムエラー確認

次のステップ: [API仕様](../api/internal-api.md)を確認して実装を理解する
