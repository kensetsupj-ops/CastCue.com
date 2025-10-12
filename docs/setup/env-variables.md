# 環境変数設定ガイド

## .env.local ファイルの作成

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を設定してください。

## 必須の環境変数

### アプリケーション設定
```env
NODE_ENV=development
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**本番環境では:**
```env
NODE_ENV=production
APP_ORIGIN=https://castcue.com
NEXT_PUBLIC_SITE_URL=https://castcue.com
```

### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**取得方法:**
1. https://app.supabase.com/project/_/settings/api にアクセス
2. Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Project API keys → anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Project API keys → service_role (secret!) → `SUPABASE_SERVICE_ROLE_KEY`

### Twitch API
```env
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret
TWITCH_WEBHOOK_SECRET=your-random-webhook-secret
```

**取得方法:**
1. https://dev.twitch.tv/console/apps にアクセス
2. 「Register Your Application」をクリック
3. OAuth Redirect URLs: `http://localhost:3000/api/twitch/oauth/callback` を追加
4. Client ID と Client Secret を取得
5. Webhook Secret は任意の長いランダム文字列を生成:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### X (Twitter) API
```env
X_CLIENT_ID=your-x-client-id
X_CLIENT_SECRET=your-x-client-secret
X_REDIRECT_URI=${APP_ORIGIN}/api/x/oauth/callback
```

**取得方法:**
1. https://developer.twitter.com/en/portal/dashboard にアクセス
2. 新しいアプリを作成
3. User authentication settings → Set up
   - App permissions: **Read and write**
   - Type of App: **Web App**
   - Callback URI: `http://localhost:3000/api/x/oauth/callback`
   - Website URL: `http://localhost:3000`
4. OAuth 2.0 Client ID と Client Secret を取得

**開発環境でlocalhostが使えない場合:**
- `https://dev.castcue.com` などのサブドメインを使用
- または ngrok/Cloudflare Tunnel を利用

### Web Push (VAPID)
```env
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:support@castcue.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
```

**生成方法:**
```bash
npx web-push generate-vapid-keys
```

出力された Public Key と Private Key をコピーして設定してください。

**本番環境では:**
新しいキーペアを生成することを推奨します。

### 暗号化キー
```env
DATA_ENCRYPTION_KEY=base64:your-32-byte-base64-encoded-key
```

**生成方法:**
```bash
node -e "console.log('base64:' + require('crypto').randomBytes(32).toString('base64'))"
```

**重要:**
- 本番環境では必ず新しいキーを生成
- このキーが漏洩すると全OAuthトークンが復号化される
- 一度設定したら変更しない（既存の暗号化データが復号化できなくなる）

### Vercel Cron (視聴者数サンプリング)
```env
CRON_SECRET=your-random-cron-secret
```

**生成方法:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**説明:**
- Vercel Cron ジョブ (`/api/cron/sampling`) の認証に使用
- 不正なアクセスを防ぐため、長いランダム文字列を設定
- 5分ごとにアクティブな配信の視聴者数をサンプリング

**重要:**
- このシークレットはVercel Cronからのみ使用される
- ローカル開発では不要（Cron ジョブは実行されない）
- 本番環境では必ず設定すること

## 環境別の設定例

### ローカル開発環境
```env
NODE_ENV=development
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Twitch
TWITCH_CLIENT_ID=abc123...
TWITCH_CLIENT_SECRET=xyz789...
TWITCH_WEBHOOK_SECRET=random-secret-string

# X (Twitter)
X_CLIENT_ID=your-client-id
X_CLIENT_SECRET=your-client-secret
X_REDIRECT_URI=http://localhost:3000/api/x/oauth/callback

# Web Push
VAPID_PUBLIC_KEY=BG...
VAPID_PRIVATE_KEY=5g...
VAPID_SUBJECT=mailto:support@castcue.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BG...

# Encryption
DATA_ENCRYPTION_KEY=base64:ABC...
```

### Vercel開発環境 (dev.castcue.com)
```env
NODE_ENV=production
APP_ORIGIN=https://dev.castcue.com
NEXT_PUBLIC_SITE_URL=https://dev.castcue.com

# 他の変数はローカルと同じ
# ただし X_REDIRECT_URI は変更:
X_REDIRECT_URI=https://dev.castcue.com/api/x/oauth/callback
```

### 本番環境 (castcue.com)
```env
NODE_ENV=production
APP_ORIGIN=https://castcue.com
NEXT_PUBLIC_SITE_URL=https://castcue.com

# すべての環境変数を本番用に設定
# 特に以下は新しく生成:
VAPID_PUBLIC_KEY=新しいキー
VAPID_PRIVATE_KEY=新しいキー
DATA_ENCRYPTION_KEY=新しいキー
CRON_SECRET=新しいランダム文字列

X_REDIRECT_URI=https://castcue.com/api/x/oauth/callback
```

## 検証方法

環境変数が正しく設定されているか確認:

```bash
# Next.jsアプリ起動時にコンソールで確認
npm run dev
```

以下のエラーが出なければOK:
- ✅ Supabase接続成功
- ✅ VAPID keys設定済み
- ❌ "Missing Supabase environment variables" → Supabase設定を確認
- ❌ "VAPID keys not configured" → VAPID設定を確認

## トラブルシューティング

### "Invalid Supabase URL"
- `NEXT_PUBLIC_SUPABASE_URL` の形式を確認
- `https://` で始まり `.supabase.co` で終わる必要がある

### "X OAuth failed"
- `X_REDIRECT_URI` がX Developer Portalの設定と一致しているか確認
- Callback URIにポート番号も含める（例: `:3000`）

### "VAPID keys not working"
- Public KeyとPrivate Keyが対になっているか確認
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` と `VAPID_PUBLIC_KEY` が同じ値か確認

### 環境変数が読み込まれない
- `.env.local` がプロジェクトルートにあるか確認
- 開発サーバーを再起動（`Ctrl+C` → `npm run dev`）
- Vercelの場合: Environment Variables タブで設定し、再デプロイ
