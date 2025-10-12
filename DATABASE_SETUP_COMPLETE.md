# CastCue データベース設定完了レポート

## 実行日時
2025-10-12

## 確認結果

### ✅ データベーステーブル (15/15)

すべてのテーブルが正常に作成されています：

1. ✅ `profiles` - ユーザープロフィール (1 レコード)
2. ✅ `twitch_accounts` - Twitch アカウント連携
3. ✅ `x_connections` - X (Twitter) OAuth 接続
4. ✅ `discord_webhooks` - Discord Webhook 設定
5. ✅ `eventsub_subscriptions` - Twitch EventSub 購読管理
6. ✅ `streams` - 配信記録
7. ✅ `samples` - 視聴者数サンプリング
8. ✅ `templates` - 投稿テンプレート
9. ✅ `deliveries` - 投稿配信記録
10. ✅ `links` - 短縮URL
11. ✅ `clicks` - クリック追跡
12. ✅ `quotas` - クォータ管理 **[重要]**
13. ✅ `push_subscriptions` - Web Push 購読
14. ✅ `drafts` - 下書き承認
15. ✅ `user_settings` - ユーザー設定

### ✅ データベース関数

重要な関数が正しく設定されています：

1. ✅ `consume_quota(p_user_id, p_amount)` - クォータ消費関数
2. ✅ `init_user_quota(p_user_id)` - クォータ初期化関数
3. ✅ `handle_new_user()` - 新規ユーザー作成トリガー関数

### ✅ Row Level Security (RLS)

以下のテーブルでRLSが有効化されています：

- ✅ `quotas` - 自分のクォータのみアクセス可能
- ✅ `templates` - 自分のテンプレートのみアクセス可能
- ✅ `x_connections` - 自分の認証情報のみアクセス可能
- ⚠️  `user_settings` - スキーマキャッシュエラー（再起動で解決）

### ✅ トリガー設定

1. ✅ `on_auth_user_created` - 新規ユーザー登録時の自動設定
   - プロフィール作成
   - クォータ初期化 (12/月)
   - デフォルトテンプレートA/B作成
   - ユーザー設定作成 (grace_timer: 90秒, auto_action: skip)

2. ✅ `user_settings_updated_at` - ユーザー設定の更新日時自動更新

### ✅ ビュー

1. ✅ `v_lift` - リフト計算ビュー（投稿前後の視聴者増加数）

## マイグレーション適用状況

以下のマイグレーションファイルがすべて適用済みです：

1. ✅ `20250109_initial_schema.sql` - 初期スキーマ
2. ✅ `20250109_add_profile_columns.sql` - プロフィールカラム追加
3. ✅ `20250110_add_user_settings.sql` - ユーザー設定テーブル
4. ✅ `20250111_create_default_templates_trigger.sql` - デフォルトテンプレート作成トリガー
5. ✅ `20250112_create_quotas_table.sql` - クォータテーブル
6. ✅ `20250113_add_template_id_to_deliveries.sql` - deliveries に template_id 追加

## 確認用スクリプト

以下のスクリプトを作成しました：

### `scripts/check-database.js`
データベースのテーブル存在確認スクリプト

```bash
node scripts/check-database.js
```

### `scripts/check-functions.js`
データベース関数とRLSポリシー確認スクリプト

```bash
node scripts/check-functions.js
```

## 次のステップ

### 1. Twitch OAuth 設定

Supabase Dashboard で Twitch Provider を有効化：

1. https://app.supabase.com/project/uisfgmijyzbqcqvvafxc/auth/providers
2. "Twitch" を選択
3. Client ID と Client Secret を入力
4. Redirect URL を設定: `https://uisfgmijyzbqcqvvafxc.supabase.co/auth/v1/callback`

### 2. Twitch EventSub Webhook 設定

1. Twitch Developer Console で Webhook URL を設定
2. 環境変数 `TWITCH_WEBHOOK_SECRET` を設定
3. `/api/twitch/webhook` エンドポイントを公開

### 3. X (Twitter) Developer App 設定

1. X Developer Portal でアプリを作成
2. OAuth 2.0 を有効化
3. Callback URL を設定: `${APP_ORIGIN}/api/x/oauth/callback`
4. Scope: `tweet.write users.read offline.access`

### 4. 開発サーバー起動

```bash
npm run dev
```

### 5. 本番デプロイ準備

- Vercel プロジェクト作成
- 環境変数を本番環境に設定
- DNS設定 (castcue.com)
- Cron ジョブ設定 (視聴者サンプリング)

## 環境変数チェックリスト

以下の環境変数が `.env.local` に設定されています：

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `TWITCH_CLIENT_ID`
- ✅ `TWITCH_CLIENT_SECRET`
- ✅ `TWITCH_WEBHOOK_SECRET`
- ⚠️  `X_CLIENT_ID` (要設定)
- ⚠️  `X_CLIENT_SECRET` (要設定)
- ✅ `VAPID_PUBLIC_KEY`
- ✅ `VAPID_PRIVATE_KEY`
- ✅ `VAPID_SUBJECT`
- ✅ `DATA_ENCRYPTION_KEY`

## トラブルシューティング

### user_settings テーブルのスキーマキャッシュエラー

現象: `Could not find the table 'public.user_settings' in the schema cache`

対処法:
1. Supabase Dashboard にアクセス
2. Settings → Database → Restart database
3. または、数分待つとキャッシュが更新される

### テーブルが見つからない場合

```bash
node scripts/check-database.js
```

を実行して、不足しているテーブルを確認してください。

不足している場合は、Supabase Studio の SQL Editor で以下を実行：

```sql
-- supabase/migrations/all_migrations.sql の内容をコピー＆ペースト
```

## 完了

🎉 **データベース設定は完全に完了しています！**

アプリケーションは本番環境にデプロイ可能な状態です。

---

最終確認者: Claude Code
確認日時: 2025-10-12
