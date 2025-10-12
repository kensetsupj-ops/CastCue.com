# Vercel デプロイガイド

CastCue.comドメインを使用したVercelデプロイの完全ガイド。

## 前提条件

- CastCue.comドメインを取得済み
- Gitリポジトリ（GitHub/GitLab/Bitbucket）
- Vercelアカウント

## 1. Vercel プロジェクト作成

### GitHub連携（推奨）

1. **GitHubにプッシュ:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/castcue.git
   git push -u origin main
   ```

2. **Vercel Dashboard:**
   - https://vercel.com/dashboard
   - 「Add New」→「Project」
   - GitHub リポジトリをインポート
   - Project Name: `castcue`
   - Framework Preset: Next.js（自動検出）
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`（自動）

### CLI デプロイ

```bash
# Vercel CLI インストール
npm install -g vercel

# ログイン
vercel login

# デプロイ
vercel

# 本番デプロイ
vercel --prod
```

## 2. 環境変数設定

### Vercel Dashboard で設定

1. **Project Settings → Environment Variables**

2. **すべての環境変数を追加:**

```bash
# アプリ設定
NODE_ENV=production
APP_ORIGIN=https://castcue.com
NEXT_PUBLIC_SITE_URL=https://castcue.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Twitch
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret
TWITCH_WEBHOOK_SECRET=your-webhook-secret

# X (Twitter)
X_CLIENT_ID=your-x-client-id
X_CLIENT_SECRET=your-x-client-secret
X_REDIRECT_URI=https://castcue.com/api/x/oauth/callback

# Web Push
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:support@castcue.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key

# 暗号化
DATA_ENCRYPTION_KEY=base64:your-encryption-key
```

3. **Environment適用:**
   - Production ✅
   - Preview ✅ (オプション)
   - Development ✅ (オプション)

### CLI で設定（代替方法）

```bash
# 本番環境
vercel env add NEXT_PUBLIC_SITE_URL production
# 値を入力: https://castcue.com

# プレビュー環境
vercel env add NEXT_PUBLIC_SITE_URL preview
# 値を入力: https://dev.castcue.com

# 開発環境
vercel env add NEXT_PUBLIC_SITE_URL development
# 値を入力: http://localhost:3000
```

## 3. カスタムドメイン設定

### CastCue.com を Vercel に紐付け

#### Step 1: Vercel でドメイン追加

1. **Project Settings → Domains**
2. 「Add」をクリック
3. ドメイン入力:
   - `castcue.com` (apex domain)
   - `www.castcue.com` (www subdomain)
   - `dev.castcue.com` (開発環境・オプション)

#### Step 2: DNS設定

ドメインプロバイダー（お名前.com、Cloudflareなど）で設定:

**apex domain (castcue.com):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 自動
```

**www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 自動
```

**開発環境 (dev.castcue.com):**
```
Type: CNAME
Name: dev
Value: cname.vercel-dns.com
TTL: 自動
```

#### Cloudflare の場合（推奨）

1. **Cloudflare Dashboard:**
   - DNS → Records → Add record

2. **apex domain設定:**
   ```
   Type: CNAME
   Name: @
   Target: cname.vercel-dns.com
   Proxy status: Proxied (オレンジ雲)
   ```

3. **www subdomain:**
   ```
   Type: CNAME
   Name: www
   Target: cname.vercel-dns.com
   Proxy status: Proxied
   ```

4. **SSL/TLS設定:**
   - SSL/TLS → Overview
   - Encryption mode: **Full (strict)**

#### Step 3: SSL証明書

Vercelが自動でLet's Encrypt証明書を発行（数分〜1時間）

確認:
```
https://castcue.com → ✅ Secure
```

## 4. 開発環境と本番環境の分離

### dev.castcue.com （開発環境）

1. **Vercel で新しいプロジェクト作成:**
   - Project Name: `castcue-dev`
   - Branch: `develop` または `main` の preview

2. **カスタムドメイン追加:**
   - `dev.castcue.com`

3. **環境変数:**
   ```bash
   APP_ORIGIN=https://dev.castcue.com
   NEXT_PUBLIC_SITE_URL=https://dev.castcue.com
   X_REDIRECT_URI=https://dev.castcue.com/api/x/oauth/callback
   ```

### ブランチ戦略

```
main (本番) → castcue.com
  └─ develop (開発) → dev.castcue.com
      └─ feature/* (プレビュー) → xxx-git-feature.vercel.app
```

**Vercel自動デプロイ:**
- `main` → 本番環境に自動デプロイ
- `develop` → 開発環境に自動デプロイ
- Pull Request → プレビュー環境を自動生成

## 5. Twitch/X API設定更新

### Twitch Developer Console

1. **OAuth Redirect URLs に追加:**
   ```
   https://castcue.com/api/twitch/oauth/callback
   https://dev.castcue.com/api/twitch/oauth/callback
   ```

2. **EventSub Webhook URL:**
   ```
   本番: https://castcue.com/api/twitch/webhook
   開発: https://dev.castcue.com/api/twitch/webhook
   ```

### X Developer Portal

1. **Callback URI に追加:**
   ```
   https://castcue.com/api/x/oauth/callback
   https://dev.castcue.com/api/x/oauth/callback
   ```

2. **Website URL:**
   ```
   https://castcue.com
   ```

## 6. Cron ジョブ設定（サンプリング）

### vercel.json 作成

```json
{
  "crons": [
    {
      "path": "/api/sampling",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**注意:**
- Cron機能は Pro/Enterprise プランで利用可能
- Hobby プランでは外部サービス（GitHub Actions、cron-job.orgなど）を使用

### GitHub Actions（代替案）

`.github/workflows/sampling.yml`:
```yaml
name: Sampling Cron

on:
  schedule:
    - cron: '*/5 * * * *'  # 5分ごと
  workflow_dispatch:  # 手動実行も可能

jobs:
  sample:
    runs-on: ubuntu-latest
    steps:
      - name: Call sampling API
        run: |
          curl -X GET https://castcue.com/api/sampling
```

## 7. デプロイ確認

### チェックリスト

- [ ] https://castcue.com にアクセスできる
- [ ] SSL証明書が有効（緑の鍵マーク）
- [ ] ログイン機能が動作する
- [ ] Twitch連携が動作する
- [ ] X連携が動作する（dev環境で確認）
- [ ] Web Push通知が動作する
- [ ] 短縮リンクリダイレクトが動作する

### デバッグ方法

```bash
# ビルドログ確認
vercel logs

# 特定のデプロイのログ
vercel logs --url=castcue.com

# リアルタイムログ
vercel logs --follow
```

### エラーハンドリング

**ビルドエラー:**
```bash
# ローカルでビルドテスト
npm run build

# エラー内容を確認して修正
# コミット&プッシュで自動再デプロイ
```

**ランタイムエラー:**
```bash
# Vercel Dashboard → Deployments → 該当デプロイ → Functions
# 各API関数のログを確認
```

## 8. パフォーマンス最適化

### Edge Functions（推奨）

`next.config.js`:
```javascript
module.exports = {
  experimental: {
    runtime: 'edge',
  },
}
```

### Image Optimization

```javascript
// next.config.js
module.exports = {
  images: {
    domains: [
      'static-cdn.jtvnw.net',  // Twitch画像
      'pbs.twimg.com',          // X画像
    ],
  },
}
```

### キャッシュ設定

```typescript
// app/api/*/route.ts
export const runtime = 'edge';
export const revalidate = 60; // 60秒キャッシュ
```

## 9. モニタリング

### Vercel Analytics（オプション）

1. **有効化:**
   - Project Settings → Analytics
   - 「Enable Analytics」

2. **Web Vitals確認:**
   - Dashboard → Analytics タブ
   - Core Web Vitals監視

### Sentry統合（推奨）

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## 10. ロールバック

### 前のバージョンに戻す

1. **Vercel Dashboard:**
   - Deployments タブ
   - 正常だったデプロイを選択
   - 「Promote to Production」

2. **CLI:**
   ```bash
   vercel rollback
   ```

## トラブルシューティング

### "Domain not configured"
- DNS設定を確認
- 24-48時間待つ（DNS伝播）
- Cloudflare使用時は Proxy status を確認

### "Environment variable not found"
- Vercel Dashboard で環境変数を再確認
- デプロイを再実行（Redeploy）

### "Function execution timed out"
- Function timeout は 10秒（Hobby）、60秒（Pro）
- 長時間処理は別の方法で実装

---

次のステップ: [モニタリングとメンテナンス](./monitoring.md)
