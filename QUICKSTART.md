# CastCue - Vercel デプロイクイックスタート

このガイドでは、CastCueを最速でVercelにデプロイする手順を説明します。

---

## ✅ 必要なもの

開始前に以下を準備してください：

- [ ] **Vercelアカウント** - https://vercel.com でサインアップ
- [ ] **Supabaseプロジェクト** - データベースとテーブルが設定済み
- [ ] **Twitchアプリ** - Client ID/Secret取得済み
- [ ] **Xアプリ** - Client ID/Secret取得済み
- [ ] **GitHubリポジトリ** - コードをプッシュ済み

---

## ⚠️ 本番運用前の必須対応

### Upstash Redisのセットアップ（レート制限）

**重要**: 現在のレート制限はインメモリ実装のため、Vercel環境では**効果がありません**。

**影響**:
- API乱用によるクォータ枯渇
- 重複投稿による意図しないツイート
- データベース負荷増加

**解決策**: Upstash Redisへの移行（15分で完了）

**セットアップ手順**:
1. https://upstash.com でアカウント作成（無料）
2. **"Create Database"** → Redis → グローバルリージョン選択
3. **"REST API"** タブから取得:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Vercel環境変数に追加
5. `lib/ratelimit.ts` を更新（実装例: `docs/deployment/upstash-setup.md`）

**無料プラン制限**: 10,000 commands/day（小規模運用には十分）

詳細: `docs/deployment/upstash-setup.md`

---

## 🚀 5ステップデプロイ

### Step 1: Vercelにプロジェクトをインポート

1. https://vercel.com/new にアクセス
2. GitHubリポジトリを接続
3. `CastCue` を選択
4. **"Import"** をクリック

### Step 2: 環境変数を設定

**Environment Variables** タブで以下をコピー&ペースト：

```bash
# 本番環境URL（デプロイ後に更新）
APP_ORIGIN=https://your-project.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app

# Supabase（あなたの値に置き換え）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Twitch（あなたの値に置き換え）
TWITCH_CLIENT_ID=xxxxx
TWITCH_CLIENT_SECRET=xxxxx
TWITCH_WEBHOOK_SECRET=xxxxx

# X/Twitter（あなたの値に置き換え）
X_CLIENT_ID=xxxxx
X_CLIENT_SECRET=xxxxx
X_REDIRECT_URI=https://your-project.vercel.app/api/x/oauth/callback

# Web Push VAPID（生成コマンド: npx web-push generate-vapid-keys）
VAPID_PUBLIC_KEY=xxxxx
VAPID_PRIVATE_KEY=xxxxx
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxxxx

# 暗号化キー（生成コマンド: node -e "console.log('base64:' + require('crypto').randomBytes(32).toString('base64'))"）
DATA_ENCRYPTION_KEY=base64:xxxxx

# Cron認証（生成コマンド: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"）
CRON_SECRET=xxxxx
```

**重要**: すべての環境変数を **Production, Preview, Development** に適用してください。

### Step 3: デプロイ

1. **"Deploy"** ボタンをクリック
2. ビルドログを確認（2-5分）
3. デプロイURLを取得（例: `https://castcue.vercel.app`）

### Step 4: 環境変数を更新

デプロイ後、実際のURLで環境変数を更新：

1. Vercel Dashboard → Settings → Environment Variables
2. 以下を更新：
   - `APP_ORIGIN` → `https://your-actual-url.vercel.app`
   - `NEXT_PUBLIC_SITE_URL` → `https://your-actual-url.vercel.app`
   - `X_REDIRECT_URI` → `https://your-actual-url.vercel.app/api/x/oauth/callback`
3. **Deployments** → 最新のデプロイ → **"Redeploy"**

### Step 5: 外部サービスを更新

#### X Developer Portal
1. https://developer.twitter.com/en/portal/dashboard
2. アプリ設定 → User authentication settings
3. Callback URI: `https://your-actual-url.vercel.app/api/x/oauth/callback`
4. Website URL: `https://your-actual-url.vercel.app`

#### Twitch Developer Console
1. https://dev.twitch.tv/console/apps
2. EventSub Webhook設定
3. Webhook URL: `https://your-actual-url.vercel.app/api/twitch/webhook`

---

## ✅ 動作確認

デプロイ後、以下を確認してください：

1. **サイトにアクセス**: `https://your-actual-url.vercel.app`
2. **ログイン**: Supabase認証が動作するか
3. **Twitch連携**: アカウント連携が成功するか
4. **X連携**: アカウント連携が成功するか
5. **Web Push**: 通知許可リクエストが表示されるか

---

## 🔧 Cron Jobs確認

1. Vercel Dashboard → Settings → Cron Jobs
2. 以下が表示されているか確認：
   - `/api/cron/sampling` - 5分ごと
   - `/api/cron/reset-quotas` - 毎月1日

---

## 🐛 トラブルシューティング

### ビルドエラー
```bash
# ローカルで確認
npm run build

# 成功すればOK
```

### 環境変数エラー
- Vercel Dashboard → Settings → Environment Variables
- すべての変数が設定されているか確認
- Production, Preview, Development すべてに適用されているか確認

### Supabase接続エラー
- Supabase Dashboard → Settings → API
- URL と Anon Key を確認
- 環境変数と一致しているか確認

---

## 📚 詳細ドキュメント

詳しい手順は以下を参照：
- **[完全デプロイガイド](docs/deployment/vercel-deployment.md)**
- [外部サービス設定](docs/setup/external-services.md)
- [環境変数リファレンス](docs/setup/env-variables.md)
- [データベースセットアップ](docs/database/db-setup-tasks.md)

---

## 🎉 デプロイ完了！

すべての確認が完了したら、本番環境でCastCueを使用できます。

**次のステップ**:
1. テストユーザーで配信開始を試す
2. 通知が届くか確認
3. X投稿が成功するか確認
4. レポートが正しく表示されるか確認

問題がある場合は、[トラブルシューティングガイド](docs/development/troubleshooting.md)を参照してください。
