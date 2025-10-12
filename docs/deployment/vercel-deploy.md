# Vercel 本番デプロイガイド

このガイドでは、CastCueをVercelに本番デプロイする完全な手順を説明します。

---

## 📋 前提条件

- Vercel アカウント
- GitHub アカウント（推奨）
- ドメイン: castcue.com（取得済み）
- Supabase プロジェクト
- Twitch Developer アプリ
- X Developer アプリ

---

## 🚀 Step 1: Vercel プロジェクトを作成

### 1-1. Vercel にログイン

```
https://vercel.com/
```

Githubアカウントでログインすることを推奨。

### 1-2. 新しいプロジェクトを作成

1. **"Add New..." → "Project" をクリック**

2. **Git リポジトリをインポート**（推奨）:
   - GitHub リポジトリを選択
   - または、新しくリポジトリを作成

3. **または、手動でデプロイ**:
   - Vercel CLI を使用してローカルからデプロイ

### 1-3. プロジェクト設定

#### Framework Preset

```
Next.js
```

Vercelが自動的に検出します。

#### Root Directory

```
./
```

（デフォルトのまま）

#### Build Command

```
npm run build
```

#### Output Directory

```
.next
```

#### Install Command

```
npm install
```

---

## 🔐 Step 2: 環境変数を設定

### 2-1. Vercel Dashboard で環境変数を追加

プロジェクト → Settings → Environment Variables

### 2-2. 必須の環境変数

以下をすべて追加してください：

#### Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=https://uisfgmijyzbqcqvvafxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### App URLs

```bash
NODE_ENV=production
APP_ORIGIN=https://castcue.com
NEXT_PUBLIC_SITE_URL=https://castcue.com
```

⚠️ **重要**: デプロイ前は Vercel の Preview URL を使用：
```bash
APP_ORIGIN=https://castcue.vercel.app
```

#### Twitch

```bash
TWITCH_CLIENT_ID=1e5e6fs1dxgsjc3b1oeyr326513w6o
TWITCH_CLIENT_SECRET=7roj0koxwow26tfirbwh9nz85498x1
TWITCH_WEBHOOK_SECRET=f604c0ba808ec8d81879b6dd91f364578dedf597918a76e9b075456180a13523
```

#### X (Twitter)

```bash
X_CLIENT_ID=<本番用Client ID>
X_CLIENT_SECRET=<本番用Client Secret>
X_REDIRECT_URI=${APP_ORIGIN}/api/x/oauth/callback
```

⚠️ 本番用のX Developerアプリを作成して、そのClient ID/Secretを使用してください。

#### Web Push (VAPID)

```bash
VAPID_PUBLIC_KEY=BGl8sAZFJtzLh_z9Nn4fpKbZeFXRRrJfa-yKaqdCQBBlu9vBkBvS8BpwUkUsDAjP9yzb91HhZNSkJK1u9w3JnDo
VAPID_PRIVATE_KEY=5g335Q8FSJBEAQPCawIrOSYhJ1QaoBZrAZ_0RYYoGOc
VAPID_SUBJECT=mailto:support@castcue.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGl8sAZFJtzLh_z9Nn4fpKbZeFXRRrJfa-yKaqdCQBBlu9vBkBvS8BpwUkUsDAjP9yzb91HhZNSkJK1u9w3JnDo
```

⚠️ **セキュリティ**: 本番環境では新しいVAPID鍵ペアを生成することを推奨：
```bash
npx web-push generate-vapid-keys
```

#### 暗号化キー

```bash
DATA_ENCRYPTION_KEY=base64:/rQGuaijVUGL4sv5/vPBfzAu2a+Glhh+FLhJNiIZzbg=
```

⚠️ **重要**: この値は一度設定したら変更しないでください。変更すると既存のトークンが復号化できなくなります。

#### Cron Secret（オプション）

```bash
CRON_SECRET=<ランダムな文字列>
```

Cron ジョブのセキュリティのため：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2-3. 環境変数のスコープ

すべての環境変数を以下のスコープで設定：

- ✅ Production
- ✅ Preview
- ✅ Development

---

## 🌐 Step 3: DNS設定（castcue.com）

### 3-1. Vercel でドメインを追加

1. プロジェクト → Settings → Domains
2. "Add" をクリック
3. `castcue.com` を入力
4. "Add" をクリック

### 3-2. DNS レコードを設定

#### Option A: Vercel Nameservers（推奨）

ドメインレジストラで Vercel の Nameservers を設定：

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

#### Option B: A Record / CNAME

既存のNameserversを使用する場合：

**A Record**:
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME Record**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com.
```

### 3-3. SSL証明書

Vercelが自動的にLet's Encrypt証明書を発行します（数分〜数時間）。

---

## ⚙️ Step 4: Vercel設定の最適化

### 4-1. vercel.json を確認

プロジェクトルートに `vercel.json` ファイルがあることを確認：

```json
{
  "crons": [
    {
      "path": "/api/cron/sampling",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/reset-quotas",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

これにより以下が自動実行されます：
- 視聴者数サンプリング: 5分ごと
- クォータリセット: 毎月1日午前0時UTC

### 4-2. ビルド設定

プロジェクト → Settings → General

**Node.js Version**:
```
20.x（推奨）
```

**Build & Development Settings**:
```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
```

---

## 🔄 Step 5: デプロイ

### 5-1. 初回デプロイ

Vercel Dashboard で "Deploy" をクリック、またはGitにプッシュすると自動的にデプロイされます。

```bash
# Git経由でデプロイ
git add .
git commit -m "Initial production deployment"
git push origin main
```

### 5-2. デプロイの進行状況を確認

Vercel Dashboard → Deployments

以下のステップが表示されます：
1. ✅ Building
2. ✅ Assigning Domains
3. ✅ Ready

### 5-3. デプロイURL

最初は以下のURLでアクセス可能：
```
https://castcue.vercel.app
```

DNS設定が完了すると：
```
https://castcue.com
```

---

## 🔧 Step 6: 外部サービスの本番URL設定

### 6-1. X Developer Portal

Callback URLを本番URLに更新：

```
https://castcue.com/api/x/oauth/callback
```

### 6-2. Twitch Developer Console

Redirect URLsに本番URLを追加：

```
https://uisfgmijyzbqcqvvafxc.supabase.co/auth/v1/callback
```

（Supabase Authを使用する場合、これのみで十分）

### 6-3. Twitch EventSub

Webhook URLを本番URLに更新：

```
https://castcue.com/api/twitch/webhook
```

新しいEventSub購読を作成する必要があります（開発環境の購読は無効化）。

---

## ✅ Step 7: 動作確認

### 7-1. 基本機能テスト

```
https://castcue.com
```

1. **ログインページ**
   - Twitchログインが動作するか確認

2. **ダッシュボード**
   - データが正しく表示されるか確認

3. **X連携**
   - `/integrations` で X 連携ができるか確認

4. **Web Push通知**
   - `/settings` で通知を有効化できるか確認

### 7-2. Webhook テスト

#### Twitch EventSub Webhook

```bash
# Twitch側でテストイベントを送信
# または、実際に配信を開始してテスト
```

#### X投稿テスト

1. 配信を開始
2. Web Push通知を受信
3. 「テンプレートで投稿」をクリック
4. X に投稿される

### 7-3. Cronジョブ確認

Vercel Dashboard → Cron Jobs

以下が表示されることを確認：
- `/api/cron/sampling` - 5分ごと
- `/api/cron/reset-quotas` - 毎月1日

---

## 🐛 トラブルシューティング

### 問題: ビルドが失敗する

**エラー例**: "Build failed with exit code 1"

**確認項目**:
1. 環境変数がすべて設定されているか
2. `npm run build` がローカルで成功するか
3. TypeScriptエラーがないか

**解決**:
```bash
# ローカルでビルドテスト
npm run build

# エラーを修正してプッシュ
git add .
git commit -m "Fix build errors"
git push
```

### 問題: 環境変数が反映されない

**原因**: デプロイ後に環境変数を追加/変更した

**解決**:
1. Vercel Dashboard → Deployments
2. 最新のデプロイで "..." → "Redeploy"
3. "Use existing Build Cache" のチェックを外す

### 問題: OAuth認証が失敗する

**原因**: Redirect URLが本番URLと一致していない

**解決**:
1. X Developer Portal / Twitch Developer Console でRedirect URLを確認
2. `https://castcue.com` が設定されているか確認
3. 環境変数 `APP_ORIGIN` を確認

### 問題: Webhookが動作しない

**原因**: Webhook URLが古い

**解決**:
1. Twitch EventSub の購読を削除
2. 新しい購読を作成（本番URL使用）
3. 署名検証が正しく動作するか確認

---

## 📊 Step 8: モニタリング設定

### 8-1. Vercel Analytics

プロジェクト → Analytics

- ページビュー
- ユーザー数
- Core Web Vitals

### 8-2. Vercel Logs

プロジェクト → Logs

リアルタイムログを確認：
- API エラー
- Serverless Function の実行
- Webhook受信

### 8-3. Cron Job Logs

プロジェクト → Cron Jobs → View Logs

サンプリングジョブの実行状況を確認。

---

## 🔒 セキュリティチェック

### 8-1. 環境変数の確認

以下がProduction環境にのみ設定されていることを確認：

- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `TWITCH_CLIENT_SECRET`
- ✅ `X_CLIENT_SECRET`
- ✅ `VAPID_PRIVATE_KEY`
- ✅ `DATA_ENCRYPTION_KEY`
- ✅ `CRON_SECRET`

⚠️ これらの値は絶対に公開しないでください。

### 8-2. RLS ポリシー確認

Supabase Dashboard → Database → Policies

すべてのテーブルでRLSが有効化されていることを確認。

### 8-3. CORS設定

必要に応じて `next.config.js` でCORS設定を追加。

---

## 🚀 継続的デプロイメント

### Git Push でデプロイ

```bash
# 変更をコミット
git add .
git commit -m "Add new feature"

# プッシュすると自動デプロイ
git push origin main
```

Vercelが自動的に：
1. ビルド
2. テスト
3. デプロイ
4. DNS更新

### Preview Deployments

ブランチをプッシュすると、自動的にPreview URLが生成されます：

```bash
git checkout -b feature/new-feature
git push origin feature/new-feature

# https://castcue-<hash>.vercel.app でプレビュー可能
```

---

## 📝 本番環境チェックリスト

デプロイ前に以下を確認：

- [ ] Vercelプロジェクト作成
- [ ] 環境変数すべて設定
- [ ] DNS設定（castcue.com）
- [ ] SSL証明書発行確認
- [ ] X Developer Portal - 本番Callback URL設定
- [ ] Twitch Developer Console - 本番Redirect URL設定
- [ ] Twitch EventSub - 本番Webhook URL設定
- [ ] ログインテスト
- [ ] X連携テスト
- [ ] Web Push通知テスト
- [ ] 投稿テスト
- [ ] Cronジョブ動作確認
- [ ] Vercel Analytics有効化
- [ ] ログモニタリング設定

---

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [CastCue - vercel.json](../../vercel.json)

---

## 🎉 デプロイ完了後

本番環境が稼働したら：

1. **ユーザーテスト**
   - 実際のTwitch配信でテスト
   - X投稿が正常に動作することを確認
   - クリック追跡が動作することを確認

2. **パフォーマンス最適化**
   - Vercel Analytics でCore Web Vitalsを確認
   - 画像最適化
   - キャッシュ設定

3. **ドキュメント更新**
   - README.md に本番URLを追加
   - ユーザーガイドを作成

4. **マーケティング**
   - Twitch配信者コミュニティに告知
   - X でローンチツイート

---

最終更新: 2025-10-12
作成者: Claude Code
