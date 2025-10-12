# Supabase マイグレーション実行ガイド

## 概要

このガイドでは、Supabase Dashboardを使用してデータベースマイグレーションを実行する手順を説明します。

## 前提条件

- Supabaseプロジェクトが作成済み
- プロジェクトURL: `https://uisfgmijyzbqcqvvafxc.supabase.co`
- Supabase Dashboardへのアクセス権限

## 実行手順

### 1. Supabase Dashboardにログイン

1. ブラウザで以下のURLにアクセス:
   ```
   https://app.supabase.com/project/uisfgmijyzbqcqvvafxc
   ```

2. Supabaseアカウントでログイン

### 2. SQL Editorを開く

1. 左側のサイドバーから「SQL Editor」をクリック
2. 「New query」ボタンをクリック

### 3. マイグレーションSQLを実行

1. 以下のファイルを開く:
   ```
   supabase/migrations/all_migrations.sql
   ```

2. ファイルの全内容をコピー（Ctrl+A → Ctrl+C）

3. Supabase SQL Editorに貼り付け（Ctrl+V）

4. 右下の「Run」ボタンをクリック、または Ctrl+Enter で実行

5. 実行完了を待つ（通常30秒〜1分程度）

### 4. 実行結果の確認

#### 成功した場合

- 「Success. No rows returned」というメッセージが表示される
- これは正常です（テーブル作成のSQLは行を返さないため）

#### エラーが発生した場合

**よくあるエラーと対処法:**

1. **"relation already exists" エラー**
   ```
   ERROR: relation "profiles" already exists
   ```
   **対処法**: テーブルが既に存在する場合のエラー。`IF NOT EXISTS` が含まれているため、通常は問題ありません。

2. **"type already exists" エラー**
   ```
   ERROR: type "channel_type" already exists
   ```
   **対処法**: ENUMタイプが既に存在する場合のエラー。無視して次に進んでください。

3. **"function already exists" エラー**
   ```
   ERROR: function "consume_quota" already exists
   ```
   **対処法**: `CREATE OR REPLACE FUNCTION` を使用しているため、通常は問題ありません。

### 5. テーブル作成の確認

1. 左側のサイドバーから「Table Editor」をクリック

2. 以下の14個のテーブルが作成されていることを確認:
   - ✅ profiles
   - ✅ twitch_accounts
   - ✅ x_connections
   - ✅ discord_webhooks
   - ✅ eventsub_subscriptions
   - ✅ streams
   - ✅ samples
   - ✅ templates
   - ✅ deliveries
   - ✅ links
   - ✅ clicks
   - ✅ quotas
   - ✅ push_subscriptions
   - ✅ drafts
   - ✅ user_settings

### 6. 関数の確認

1. 左側のサイドバーから「Database」→「Functions」をクリック

2. 以下の関数が作成されていることを確認:
   - ✅ init_user_quota
   - ✅ consume_quota
   - ✅ handle_new_user
   - ✅ update_updated_at

### 7. トリガーの確認

1. SQL Editorで以下のクエリを実行:
   ```sql
   SELECT trigger_name, event_object_table
   FROM information_schema.triggers
   WHERE trigger_schema = 'public';
   ```

2. 以下のトリガーが作成されていることを確認:
   - ✅ on_auth_user_created (auth.usersテーブル)
   - ✅ user_settings_updated_at (user_settingsテーブル)

### 8. RLS (Row Level Security) の確認

1. SQL Editorで以下のクエリを実行:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

2. すべてのテーブルで `rowsecurity = true` になっていることを確認

## トラブルシューティング

### マイグレーションが途中で失敗した場合

**対処法1: 部分的に実行**

1. エラーが発生した箇所を特定
2. エラー箇所より前のSQLは実行済みなので、エラー箇所以降のSQLのみを実行

**対処法2: 既存のデータベースをリセット**

⚠️ **注意**: この操作は全てのデータを削除します

1. Supabase Dashboard → Settings → Database
2. 「Reset Database Password」セクションの下にある「Dangerous」タブ
3. 「Reset database」ボタンをクリック
4. 確認後、全マイグレーションを再実行

### データベース接続エラー

**症状**: "Invalid API key" エラー

**対処法**:
1. `.env.local` の以下を確認:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Supabase Dashboard → Settings → API で正しいキーを再取得

### 権限エラー

**症状**: "permission denied" エラー

**対処法**:
1. Service Roleキーを使用しているか確認
2. RLSポリシーが正しく設定されているか確認

## 検証スクリプト

マイグレーション完了後、以下のスクリプトで検証できます:

```bash
node scripts/check-db.js
```

**期待される出力**:
```
🔍 Checking Supabase Database Tables...

✅ profiles - EXISTS
✅ twitch_accounts - EXISTS
✅ x_connections - EXISTS
...
```

## 次のステップ

マイグレーションが完了したら:

1. ✅ アプリケーションを起動
   ```bash
   npm run dev
   ```

2. ✅ Twitch認証をテスト
   - http://localhost:3000/login にアクセス
   - 「Twitchでログイン」をクリック

3. ✅ 新規ユーザー作成時のトリガー動作確認
   - 新規ユーザー登録
   - `templates` テーブルに2件のデフォルトテンプレートが自動作成されることを確認
   - `user_settings` テーブルにレコードが作成されることを確認
   - `quotas` テーブルにレコードが作成されることを確認

## 参考リンク

- [Supabase Dashboard](https://app.supabase.com/project/uisfgmijyzbqcqvvafxc)
- [Database Schema Documentation](../database/schema.md)
- [Troubleshooting Guide](../development/troubleshooting.md)
