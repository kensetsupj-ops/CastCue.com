# 本番環境デプロイガイド

CastCueをVercelに本番デプロイするための完全ガイド。

---

## 📋 デプロイ前チェックリスト

### コード
- [ ] `.env.local`が`.gitignore`に含まれている
- [ ] すべての変更がコミットされている
- [ ] TypeScriptコンパイルエラーがない（`npm run build`）
- [ ] Lintエラーがない（`npm run lint`）

### 環境変数
- [ ] Vercelに必須環境変数がすべて設定されている
- [ ] GitHub Secretsに`APP_URL`と`CRON_SECRET`が設定されている
- [ ] 本番URLが環境変数に反映されている

### データベース
- [ ] Supabaseに`sampling_metrics`テーブルが作成されている
- [ ] すべてのマイグレーションが適用されている
- [ ] RLSポリシーが正しく設定されている

### 外部サービス
- [ ] X Developer PortalのCallback URLが本番URLに更新されている
- [ ] Twitch Developer ConsoleのRedirect URIが本番URLに更新されている

---

## 🔑 必須環境変数

以下の環境変数をVercelに設定する必要があります。

### 1. Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://uisfgmijyzbqcqvvafxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...（あなたのAnon Key）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...（あなたのService Role Key）
```

**取得方法**: Supabase Dashboard → Project Settings → API

### 2. Twitch

```env
TWITCH_CLIENT_ID=1e5e6fs1dxgsjc3b1oeyr326513w6o
TWITCH_CLIENT_SECRET=7roj0koxwow26tfirbwh9nz85498x1
TWITCH_WEBHOOK_SECRET=f604c0ba808ec8d81879b6dd91f364578dedf597918a76e9b075456180a13523
```

**取得方法**: Twitch Developer Console → Applications → 【あなたのアプリ】

### 3. X (Twitter)

```env
X_CLIENT_ID=ZkNjQmRBVlhwZTRScHJxaHBwY0Y6MTpjaQ
X_CLIENT_SECRET=yzZobERfw6egLHGeMjZpOR9T-AKeYU-MoFAuNR1AL-zGp3vwLW
X_REDIRECT_URI=https://your-production-url.vercel.app/api/x/oauth/callback
```

**取得方法**: X Developer Portal → Projects & Apps → 【あなたのアプリ】

**重要**: `X_REDIRECT_URI`はデプロイ後に本番URLで更新する必要があります。

### 4. Web Push (VAPID)

```env
VAPID_PUBLIC_KEY=BGl8sAZFJtzLh_z9Nn4fpKbZeFXRRrJfa-yKaqdCQBBlu9vBkBvS8BpwUkUsDAjP9yzb91HhZNSkJK1u9w3JnDo
VAPID_PRIVATE_KEY=5g335Q8FSJBEAQPCawIrOSYhJ1QaoBZrAZ_0RYYoGOc
VAPID_SUBJECT=mailto:support@castcue.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGl8sAZFJtzLh_z9Nn4fpKbZeFXRRrJfa-yKaqdCQBBlu9vBkBvS8BpwUkUsDAjP9yzb91HhZNSkJK1u9w3JnDo
```

**生成方法**:
```bash
npx web-push generate-vapid-keys
```

**重要**: 本番環境では必ず新しいキーペアを生成してください。

### 5. 暗号化キー

```env
DATA_ENCRYPTION_KEY=base64:/rQGuaijVUGL4sv5/vPBfzAu2a+Glhh+FLhJNiIZzbg=
```

**生成方法**:
```bash
node -e "console.log('base64:' + require('crypto').randomBytes(32).toString('base64'))"
```

**重要**: 一度設定したら絶対に変更しないでください。変更すると既存の暗号化データが復号化できなくなります。

### 6. Cron Secret

```env
CRON_SECRET=07ba6a0daca4be4290da622f8ef359bab68fd401188bed6f4669b24175c045c3
```

**生成方法**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 7. 管理者設定

```env
ADMIN_USER_IDS=e6b62696-1b5c-4610-860c-577b661a84af
ADMIN_PASSWORD=scrypt:bd3416c6f703008dfcdf29118484c74f:4233a073bd04cd841f94040dacb7d0bcba3d631d9e9d427fcf65c1262ac8affc68e0014a1e5a449b14d0dc693bc6a4449d965071b9d1395690efe1de2045a858
```

**ADMIN_USER_IDS**:
- あなたのSupabase User UUID（`auth.users.id`）
- 複数の管理者を設定する場合はカンマ区切り: `uuid1,uuid2,uuid3`

**ADMIN_PASSWORD**:
- ハッシュ化されたパスワード
- 生成方法:
```bash
node scripts/generate-admin-password.js your-password
```

---

## 🚀 デプロイ手順

### ステップ1: 変更をコミット

```bash
# 現在の変更を確認
git status

# ステージングエリアに追加
git add .

# コミット
git commit -m "feat: add admin dashboard with security improvements

- Add admin dashboard with 3-tier authentication (UUID + password hash)
- Implement scrypt password hashing for admin authentication
- Migrate from localStorage to sessionStorage for admin password
- Add sampling metrics tracking for Vercel Pro migration decision
- Fix GitHub Actions cron jobs: add Origin headers and remove duplicate workflow
- Add fallback handling for missing sampling_metrics table"

# プッシュ
git push origin main
```

### ステップ2: Vercelプロジェクトのセットアップ

#### 方法1: CLI（推奨）

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# プロジェクトをリンク
vercel link

# 環境変数を設定（.env.localから）
# 注: 本番用の値に置き換えること
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... 以下同様に全ての環境変数を追加
```

#### 方法2: Vercel Dashboard

1. https://vercel.com/new にアクセス
2. GitHubリポジトリを選択（例: `yourusername/CastCue`）
3. プロジェクト名を設定（例: `castcue`）
4. **Environment Variables**セクションで、上記の環境変数を1つずつ追加
5. Environment: **Production**, **Preview**, **Development** すべてにチェック
6. **Deploy**をクリック

### ステップ3: GitHub Secretsの設定

GitHub Actions Cron Jobsのために必要。

1. GitHubリポジトリページを開く
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**をクリック
4. 以下を追加:

```
Name: APP_URL
Value: https://your-production-url.vercel.app

Name: CRON_SECRET
Value: 07ba6a0daca4be4290da622f8ef359bab68fd401188bed6f4669b24175c045c3
```

**重要**: `APP_URL`は実際のデプロイURLに置き換えてください。

### ステップ4: 初回デプロイ

#### CLI経由

```bash
vercel --prod
```

#### GitHub経由（自動）

`main`ブランチにプッシュすると自動的にデプロイされます。

**デプロイ完了後**: Vercelが提供するURLをメモしてください（例: `https://castcue.vercel.app`）

### ステップ5: デプロイ後の設定更新

デプロイ後、本番URLを使って以下を更新します。

#### 5-1. Vercel環境変数の更新

**CLI経由**:
```bash
# X_REDIRECT_URIを更新
vercel env rm X_REDIRECT_URI production
vercel env add X_REDIRECT_URI production
# 入力: https://castcue.vercel.app/api/x/oauth/callback
```

**Dashboard経由**:
1. Vercel Dashboard → プロジェクト → Settings → Environment Variables
2. `X_REDIRECT_URI`を見つけて**Edit**
3. Value: `https://castcue.vercel.app/api/x/oauth/callback`
4. **Save**

#### 5-2. GitHub Secretsの更新

```
APP_URL=https://castcue.vercel.app
```

#### 5-3. X Developer Portalの更新

1. https://developer.twitter.com/en/portal/projects-and-apps
2. あなたのアプリを選択
3. **User authentication settings** → **Edit**
4. **Callback URI / Redirect URL**:
   ```
   https://castcue.vercel.app/api/x/oauth/callback
   ```
5. **Website URL**:
   ```
   https://castcue.vercel.app
   ```
6. **Save**

#### 5-4. Twitch Developer Consoleの更新

1. https://dev.twitch.tv/console/apps
2. あなたのアプリを選択 → **Manage**
3. **OAuth Redirect URLs**:
   ```
   https://castcue.vercel.app/api/twitch/callback
   ```
4. **Save Changes**

### ステップ6: 再デプロイ

環境変数を更新した後、再デプロイが必要です。

**CLI経由**:
```bash
vercel --prod
```

**Dashboard経由**:
1. Vercel Dashboard → プロジェクト → Deployments
2. 最新のデプロイメントの**⋯**メニュー → **Redeploy**

---

## ✅ 動作確認

### 1. 基本動作

```
https://castcue.vercel.app
```

確認項目:
- [ ] トップページが表示される
- [ ] ログインページにアクセスできる
- [ ] Supabase認証が動作する

### 2. 管理画面

```
https://castcue.vercel.app/admin
パスワード: your-admin-password
```

確認項目:
- [ ] パスワード認証が成功する
- [ ] ユーザー統計が表示される
- [ ] 成長トレンドグラフが表示される
- [ ] サンプリングメトリクスが表示される
- [ ] システムヘルスが表示される

### 3. GitHub Actions Cron Jobs

```bash
# GitHubリポジトリ → Actions → Sampling Cron Job
# 手動実行: Run workflow
```

確認項目:
- [ ] ワークフローが正常に完了する
- [ ] Supabase `sampling_metrics`テーブルにデータが記録される
- [ ] エラーログがない

**Supabaseで確認**:
```sql
SELECT * FROM sampling_metrics ORDER BY executed_at DESC LIMIT 5;
```

### 4. Vercel Cron Jobs

`vercel.json`で設定されているクォータリセット:
- 自動実行: 毎月1日 午前0時（UTC）
- 手動確認: 管理画面の「システムヘルス」セクションで確認

### 5. Twitch連携

1. ダッシュボード → インテグレーション → Twitch
2. 「Twitchと連携」をクリック
3. Twitchの認証画面が表示される
4. 認証が成功し、ダッシュボードに戻る

### 6. X連携

1. ダッシュボード → インテグレーション → X (Twitter)
2. 「Xと連携」をクリック
3. Xの認証画面が表示される
4. 認証が成功し、ダッシュボードに戻る

---

## 🔧 トラブルシューティング

### エラー: "Unauthorized" (401)

**原因**: 環境変数が正しく設定されていない

**解決策**:
1. Vercel Dashboard → Settings → Environment Variables
2. すべての環境変数が設定されているか確認
3. 値が正しいか確認（特に`SUPABASE_SERVICE_ROLE_KEY`）
4. 再デプロイ

### エラー: "Forbidden" (403)

**原因**: RLSポリシーまたは管理者権限の問題

**解決策**:
1. SupabaseですべてのテーブルにRLSポリシーが設定されているか確認
2. `ADMIN_USER_IDS`が正しいUUIDか確認
3. 管理画面の場合、パスワードハッシュが正しいか確認

### エラー: GitHub Actions が失敗する

**原因**: GitHub Secretsが設定されていない、またはURLが間違っている

**解決策**:
1. GitHub → Settings → Secrets → Actions
2. `APP_URL`が正しいか確認（`https://castcue.vercel.app`）
3. `CRON_SECRET`が環境変数と一致するか確認
4. ワークフローを手動で再実行

### エラー: X OAuth が失敗する

**原因**: Callback URLが一致していない

**解決策**:
1. X Developer Portal → アプリ設定
2. Callback URL: `https://castcue.vercel.app/api/x/oauth/callback`（完全一致）
3. Vercel環境変数 `X_REDIRECT_URI`が同じ値か確認
4. 再デプロイ

### エラー: Twitch EventSub が動作しない

**原因**: Webhook URLが正しくない、または署名検証が失敗

**解決策**:
1. Twitch Developer Console → EventSub → Subscriptions
2. Webhook URL: `https://castcue.vercel.app/api/twitch/webhook`
3. `TWITCH_WEBHOOK_SECRET`が環境変数と一致するか確認
4. 既存のサブスクリプションを削除して再作成

### エラー: サンプリングメトリクスが表示されない

**原因**: `sampling_metrics`テーブルが存在しない

**解決策**:
1. Supabase SQL Editor で以下を実行:
```sql
SELECT * FROM information_schema.tables
WHERE table_name = 'sampling_metrics';
```
2. テーブルが存在しない場合、`supabase/migrations/20250118_add_sampling_metrics.sql`を実行
3. GitHub Actions Cron Jobを手動実行してデータを生成

---

## 📊 パフォーマンス監視

### Vercel Analytics

Vercel Dashboardで以下を確認:
- リクエスト数
- レスポンスタイム
- エラー率

### Supabase監視

Supabase Dashboardで以下を確認:
- Database → Performance → Query Performance
- Database → Logs → API Logs
- Database → Logs → Postgres Logs

### GitHub Actions監視

GitHub Actions タブで以下を確認:
- Cron Jobsの実行履歴
- 失敗率
- 実行時間

---

## 🔐 セキュリティベストプラクティス

### 1. 環境変数の管理

- [ ] `.env.local`を**絶対に**Gitにコミットしない
- [ ] 本番環境では異なる暗号化キーを使用
- [ ] 定期的にシークレットをローテーション

### 2. 管理者パスワード

- [ ] 強力なパスワードを使用（16文字以上、英数字記号混在）
- [ ] パスワードハッシュを使用（平文は使用しない）
- [ ] 定期的にパスワードを変更

### 3. データベース

- [ ] すべてのテーブルでRLSを有効化
- [ ] Service Roleキーは必要最小限の使用に留める
- [ ] 定期的にバックアップを取得

### 4. API

- [ ] CORS設定を適切に行う
- [ ] レート制限を実装
- [ ] すべての外部入力をバリデーション

---

## 📝 次のステップ

デプロイ完了後:

1. **ユーザーテスト**: 実際の配信で動作確認
2. **監視設定**: エラー通知の設定（Sentry、LogRocketなど）
3. **ドキュメント更新**: README.mdに本番URLを追加
4. **カスタムドメイン**: 独自ドメインの設定（オプション）
5. **スケーリング**: ユーザー数が増えたらVercel Proへ移行を検討

---

## 🆘 サポート

問題が発生した場合:

1. **GitHub Issues**: https://github.com/yourusername/CastCue/issues
2. **ドキュメント**: `docs/development/troubleshooting.md`
3. **ログ確認**:
   - Vercel: Dashboard → Deployments → Functions → Logs
   - Supabase: Dashboard → Logs → API Logs
   - GitHub Actions: Actions → 該当ワークフロー → Logs
