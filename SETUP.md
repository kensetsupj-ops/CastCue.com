# CastCue セットアップガイド

このドキュメントでは、CastCue のローカル開発環境のセットアップ手順を説明します。

## 必要な準備

### 1. Twitch Developer アカウント

1. [Twitch Developer Console](https://dev.twitch.tv/console/apps) にアクセス
2. 新しいアプリケーションを登録
   - Name: CastCue Dev (任意)
   - OAuth Redirect URLs: `http://localhost:3000/api/twitch/callback`
   - Category: Application Integration
3. **Client ID** と **Client Secret** を記録

### 2. X (Twitter) Developer アカウント

1. [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) にアクセス
2. 新しいアプリを作成
3. Settings → User authentication settings で以下を設定：
   - App permissions: Read and write
   - Type of App: Web App
   - Callback URI: `http://localhost:3000/api/x/oauth/callback`
   - Website URL: `http://localhost:3000`
4. Keys and tokens タブで **Client ID** と **Client Secret** を記録

### 3. Supabase プロジェクト

#### オプション A: ローカル開発（推奨）

```bash
pnpm dlx supabase init
pnpm dlx supabase start
```

これにより、ローカルで Supabase が起動します。

#### オプション B: Supabase Cloud

1. [Supabase](https://app.supabase.com) でアカウント作成
2. 新しいプロジェクトを作成
3. Settings → API で以下を記録：
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

### 4. 環境変数の設定

`.env.example` を `.env.local` にコピー：

```bash
cp .env.example .env.local
```

`.env.local` を編集して、以下の値を設定：

```bash
# App URLs
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Twitch
TWITCH_CLIENT_ID=<your-twitch-client-id>
TWITCH_CLIENT_SECRET=<your-twitch-client-secret>
TWITCH_WEBHOOK_SECRET=<generate-random-string>

# X (Twitter)
X_CLIENT_ID=<your-x-client-id>
X_CLIENT_SECRET=<your-x-client-secret>
X_REDIRECT_URI=http://localhost:3000/api/x/oauth/callback

# Web Push (VAPID) - 生成方法は下記参照
VAPID_PUBLIC_KEY=<generate-vapid-public-key>
VAPID_PRIVATE_KEY=<generate-vapid-private-key>
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same-as-vapid-public-key>

# Crypto/KMS - 生成方法は下記参照
DATA_ENCRYPTION_KEY=<generate-encryption-key>
```

### 5. VAPID キーの生成

```bash
npx web-push generate-vapid-keys
```

出力された `Public Key` と `Private Key` を `.env.local` に設定します。

### 6. 暗号化キーの生成

```bash
node -e "console.log('base64:' + require('crypto').randomBytes(32).toString('base64'))"
```

出力された値を `DATA_ENCRYPTION_KEY` に設定します。

### 7. データベースのセットアップ

#### ローカル Supabase の場合

```bash
pnpm dlx supabase db push
```

#### Supabase Cloud の場合

1. Supabase Dashboard で SQL Editor を開く
2. `supabase/migrations/20250109_initial_schema.sql` の内容をコピー
3. SQL Editor で実行

### 8. 依存パッケージのインストール

```bash
pnpm install
```

### 9. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## Webhook のテスト

ローカル開発では、Twitch の Webhook を受信するために、トンネリングサービスが必要です：

### ngrok を使用する場合

```bash
ngrok http 3000
```

ngrok が生成した HTTPS URL を Twitch の Webhook callback URL として使用します：

```
https://xxxx-xxx-xxx-xxx-xxx.ngrok.io/api/twitch/webhook
```

## トラブルシューティング

### データベース接続エラー

- Supabase の URL とキーが正しいか確認
- ローカル Supabase の場合、`supabase start` が実行されているか確認

### OAuth エラー

- Redirect URI が正確に一致しているか確認
- クライアント ID とシークレットが正しいか確認

### Webhook が届かない

- ngrok などのトンネリングが起動しているか確認
- Twitch EventSub の Webhook callback URL が正しいか確認
- `TWITCH_WEBHOOK_SECRET` が設定されているか確認

## 次のステップ

1. `/dashboard` でダッシュボードを確認
2. `/integrations` で X と Discord を連携
3. `/templates` で通知テンプレートを作成
4. Twitch アカウントを接続して配信開始を検知

詳細は [README.md](./README.md) を参照してください。
