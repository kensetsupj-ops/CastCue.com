# 🚀 CastCue クイックスタートガイド

このガイドでは、CastCueを開発環境から本番環境まで最速でセットアップする手順を説明します。

**推定所要時間**: 約60分

---

## ✅ 完了済み項目

以下はすでに完了しています：

- [x] データベース設定（全15テーブル）
- [x] RLSポリシー設定
- [x] データベース関数・トリガー
- [x] バックエンドAPI（全エンドポイント）
- [x] フロントエンドUI（全ページ）
- [x] Web Push通知機能
- [x] クォータ管理機能
- [x] A/Bテスト機能
- [x] 画像投稿機能
- [x] 短縮URL・クリック追跡
- [x] 開発サーバー起動中（http://localhost:3010）

---

## 🎯 残りのセットアップ（約60分）

### Phase 1: OAuth設定（15分）

#### 1. X (Twitter) OAuth設定（10分）

**ドキュメント**: `docs/setup/x-oauth-setup.md`

**手順**:
1. https://developer.twitter.com/en/portal/dashboard にアクセス
2. 新しいアプリを作成（CastCue Development）
3. OAuth 2.0 を有効化
4. App permissions: "Read and write" を選択
5. Callback URI: `http://localhost:3010/api/x/oauth/callback`
6. Client ID/Secret を取得
7. `.env.local` に設定：
   ```bash
   X_CLIENT_ID=<取得したClient ID>
   X_CLIENT_SECRET=<取得したClient Secret>
   ```
8. 開発サーバーを再起動: `npm run dev`

**確認**:
- http://localhost:3010/integrations で X連携テスト

---

#### 2. Twitch OAuth設定（5分）

**ドキュメント**: `docs/setup/twitch-oauth-setup.md`

**手順**:
1. https://app.supabase.com/project/uisfgmijyzbqcqvvafxc/auth/providers にアクセス
2. "Twitch" Provider を探して有効化
3. Client ID/Secret を入力：
   ```
   Client ID: 1e5e6fs1dxgsjc3b1oeyr326513w6o
   Client Secret: 7roj0koxwow26tfirbwh9nz85498x1
   ```
4. 保存
5. https://dev.twitch.tv/console/apps でRedirect URLsを確認：
   ```
   https://uisfgmijyzbqcqvvafxc.supabase.co/auth/v1/callback
   ```

**確認**:
- http://localhost:3010/login で Twitchログインテスト

---

### Phase 2: アイコン作成（15分・オプション）

**ドキュメント**: `ICON_SETUP.md`

Web Push通知用のアイコンを作成します（スキップ可能）。

**必要なファイル**:
- `public/icon-192x192.png` (192x192px)
- `public/badge-72x72.png` (72x72px)

**簡単な作成方法**:
1. https://www.canva.com にアクセス
2. カスタムサイズで 192x192 を作成
3. "C" のロゴを配置（紫色背景推奨）
4. PNG形式でダウンロード
5. `public/` フォルダに配置

**スキップする場合**:
アイコンなしでもWeb Push通知は動作します（デフォルトのブラウザアイコンが表示されます）。

---

### Phase 3: ローカルテスト（10分）

#### テスト項目

**1. ログイン機能**
```
http://localhost:3010/login
```
- Twitchログインが動作するか確認
- ダッシュボードにリダイレクトされるか確認

**2. X連携**
```
http://localhost:3010/integrations
```
- "連携する" ボタンをクリック
- X認証画面が表示されるか確認
- 連携成功後、ステータスが "接続済み" になるか確認

**3. Web Push通知設定**
```
http://localhost:3010/settings
```
- "Web Push通知" セクション
- "有効にする" ボタンをクリック
- ブラウザの通知許可を確認
- ステータスが "有効" になるか確認

**4. テンプレート管理**
```
http://localhost:3010/templates
```
- テンプレートの作成・編集・削除
- プレビュー機能
- バリアント選択（A/B）

**5. ダッシュボード**
```
http://localhost:3010/dashboard
```
- データが表示されるか確認（初回は空）

---

### Phase 4: 本番デプロイ（30分）

**ドキュメント**: `docs/deployment/vercel-deploy.md`

#### Step 1: Vercel プロジェクト作成（5分）

1. https://vercel.com/ にアクセス
2. "Add New..." → "Project"
3. GitHub リポジトリをインポート
4. Framework Preset: Next.js（自動検出）

#### Step 2: 環境変数設定（10分）

すべての環境変数を設定（26個）：

**重要な環境変数**:
```bash
# App
NODE_ENV=production
APP_ORIGIN=https://castcue.vercel.app  # 後でcastcue.comに変更
NEXT_PUBLIC_SITE_URL=https://castcue.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://uisfgmijyzbqcqvvafxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# X (本番用アプリのClient ID/Secret)
X_CLIENT_ID=<本番用>
X_CLIENT_SECRET=<本番用>

# Twitch（開発と同じ）
TWITCH_CLIENT_ID=1e5e6fs1dxgsjc3b1oeyr326513w6o
TWITCH_CLIENT_SECRET=7roj0koxwow26tfirbwh9nz85498x1
TWITCH_WEBHOOK_SECRET=<同じ>

# VAPID（開発と同じ、または新規生成）
VAPID_PUBLIC_KEY=<公開鍵>
VAPID_PRIVATE_KEY=<秘密鍵>
VAPID_SUBJECT=mailto:support@castcue.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<公開鍵>

# 暗号化キー（開発と同じ・変更厳禁）
DATA_ENCRYPTION_KEY=base64:/rQGuaijVUGL4sv5/vPBfzAu2a+Glhh+FLhJNiIZzbg=

# Cron Secret（新規生成）
CRON_SECRET=<ランダムな文字列>
```

#### Step 3: デプロイ（5分）

1. "Deploy" ボタンをクリック
2. ビルド完了を待つ
3. デプロイURL確認: https://castcue.vercel.app

#### Step 4: DNS設定（5分）

1. Vercel Dashboard → Domains
2. "Add" → `castcue.com`
3. DNS レコード設定（ドメインレジストラ）：
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

#### Step 5: 外部サービス更新（5分）

**X Developer Portal**:
- Callback URI追加: `https://castcue.com/api/x/oauth/callback`

**Twitch Developer Console**:
- Redirect URL確認（Supabaseのcallback URLのみでOK）

**Vercel環境変数**:
- `APP_ORIGIN` を `https://castcue.com` に変更
- Redeploy

---

## 📋 最終チェックリスト

### データベース

- [x] 全15テーブル作成
- [x] RLSポリシー有効
- [x] quotasテーブル動作確認
- [x] handle_new_user()トリガー動作確認

### 認証・OAuth

- [ ] X Developer Portal でアプリ作成
- [ ] X Client ID/Secret を `.env.local` に設定
- [ ] X連携テスト完了
- [ ] Supabase Auth で Twitch Provider有効化
- [ ] Twitchログインテスト完了

### 通知・UI

- [ ] Web Push通知設定UI動作確認
- [ ] Service Worker登録確認
- [ ] 通知アイコン作成（オプション）
- [ ] テンプレート管理テスト完了

### デプロイ

- [ ] Vercel プロジェクト作成
- [ ] 環境変数26個すべて設定
- [ ] 初回デプロイ成功
- [ ] DNS設定完了（castcue.com）
- [ ] SSL証明書発行確認
- [ ] 本番環境でログインテスト
- [ ] 本番環境でX連携テスト
- [ ] Cronジョブ動作確認

---

## 🎉 完了後のアクション

### 1. 実運用テスト

1. **配信テスト**
   - Twitch配信を開始
   - EventSub Webhookが動作するか確認
   - Web Push通知を受信
   - X投稿テスト

2. **クリック追跡テスト**
   - 投稿されたツイートのリンクをクリック
   - クリックが記録されるか確認

3. **サンプリングテスト**
   - Cron ジョブが5分ごとに実行されるか確認
   - `/dashboard` でグラフが更新されるか確認

### 2. パフォーマンス最適化

- Vercel Analytics でCore Web Vitals確認
- 画像最適化
- キャッシュ設定

### 3. ドキュメント作成

- ユーザーガイド
- FAQ
- トラブルシューティング

---

## 🚨 問題が発生した場合

### トラブルシューティングドキュメント

- `docs/development/troubleshooting.md`
- `docs/setup/x-oauth-setup.md#troubleshooting`
- `docs/setup/twitch-oauth-setup.md#troubleshooting`
- `docs/deployment/vercel-deploy.md#troubleshooting`

### よくある問題

**Q: ログインボタンを押しても何も起きない**
- A: Supabase Auth で Twitch Provider が有効化されているか確認

**Q: X連携ができない**
- A: Client ID/Secret が正しいか確認、サーバーを再起動

**Q: Webhook が動作しない**
- A: Webhook URL が正しいか確認、署名検証エラーをログで確認

**Q: Cronジョブが実行されない**
- A: `CRON_SECRET` が設定されているか確認、Vercel Dashboard で確認

---

## 📚 ドキュメント一覧

### セットアップガイド

- `QUICK_START.md` - このファイル（クイックスタート）
- `SETUP_GUIDE.md` - 詳細なセットアップガイド
- `DATABASE_SETUP_COMPLETE.md` - データベース設定レポート
- `DEPLOYMENT_READY.md` - MVP完成レポート
- `ICON_SETUP.md` - アイコン作成ガイド

### 技術ドキュメント

- `docs/setup/env-variables.md` - 環境変数詳細
- `docs/setup/external-services.md` - 外部サービス設定
- `docs/setup/x-oauth-setup.md` - X OAuth詳細
- `docs/setup/twitch-oauth-setup.md` - Twitch OAuth詳細
- `docs/api/internal-api.md` - API仕様
- `docs/database/schema.md` - データベーススキーマ
- `docs/deployment/vercel-deploy.md` - Vercelデプロイ詳細

### プロジェクト管理

- `CLAUDE.md` - プロジェクト概要
- `docs/TASKS.md` - タスク一覧
- `README.md` - プロジェクト説明

---

## 🎯 次のマイルストーン

1. **Beta版リリース**
   - 限定ユーザーでテスト
   - フィードバック収集

2. **機能拡張**
   - メール通知
   - 推奨投稿時刻
   - Time-to-Peak計算

3. **パフォーマンス改善**
   - キャッシュ最適化
   - データベースクエリ最適化
   - 画像最適化

4. **公開リリース**
   - ランディングページ作成
   - ドキュメントサイト
   - マーケティング

---

## 💡 ヒント

- **開発環境**: 環境変数を変更したら必ずサーバーを再起動
- **X OAuth**: 本番環境では開発環境とは別のアプリを作成することを推奨
- **VAPID鍵**: 本番環境では新しく生成することを推奨（セキュリティ向上）
- **暗号化キー**: `DATA_ENCRYPTION_KEY` は絶対に変更しない（既存データが復号化できなくなる）
- **Cronジョブ**: Vercel の無料プランでも動作（制限あり）

---

**最終更新**: 2025-10-12
**開発サーバー**: http://localhost:3010 ✅
**ステータス**: MVP完成・デプロイ準備完了
**作成者**: Claude Code

---

## 🚀 今すぐ始める

```bash
# 1. X OAuth設定（10分）
# docs/setup/x-oauth-setup.md を参照

# 2. Twitch OAuth設定（5分）
# docs/setup/twitch-oauth-setup.md を参照

# 3. ローカルテスト（10分）
http://localhost:3010

# 4. Vercelデプロイ（30分）
# docs/deployment/vercel-deploy.md を参照
```

**合計所要時間**: 約60分で本番環境が稼働！
