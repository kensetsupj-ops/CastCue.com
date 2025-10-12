# CastCue データベースセットアップ手順

このドキュメントでは、Supabaseデータベースのセットアップ方法を説明します。

## 前提条件

- Supabaseアカウントとプロジェクトが作成済み
- `.env.local`に正しいSupabase URLとキーが設定済み
- Supabase CLIがインストール済み（推奨）

## 方法1: Supabase Dashboard（推奨・簡単）

### 手順

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」をクリック
4. 以下のマイグレーションファイルを**順番に**実行：

#### ステップ1: 初期スキーマ
```
supabase/migrations/20250109_initial_schema.sql
```
- 全てのテーブル（profiles, twitch_accounts, x_connections, streams, samples, templates, deliveries, links, clicks, quotas, push_subscriptions, drafts）
- RLSポリシー
- インデックス
- 基本的なトリガー

#### ステップ2: プロフィールカラム追加
```
supabase/migrations/20250109_add_profile_columns.sql
```
- Twitchプロフィール情報のカラム追加
- twitch_user_id, login, profile_image_url, broadcaster_type, email

#### ステップ3: ユーザー設定テーブル
```
supabase/migrations/20250110_add_user_settings.sql
```
- user_settingsテーブル作成
- デフォルトテンプレート、猶予タイマー、自動処理設定

#### ステップ4: デフォルトテンプレート作成トリガー
```
supabase/migrations/20250111_create_default_templates_trigger.sql
```
- 新規ユーザー登録時に自動でテンプレートA/Bを作成
- プロフィール、クォータ、ユーザー設定も自動作成

### 実行方法

1. SQL Editorで「New Query」をクリック
2. 各マイグレーションファイルの内容をコピー＆ペースト
3. 右下の「Run」ボタンをクリック
4. 成功メッセージを確認
5. 次のマイグレーションファイルへ

## 方法2: Supabase CLI（開発者向け）

### 前提条件

Supabase CLIのインストール:
```bash
npm install -g supabase
```

### 手順

1. プロジェクトディレクトリに移動:
```bash
cd C:\Users\kochi202504\CastCue
```

2. Supabaseにログイン:
```bash
supabase login
```

3. プロジェクトをリンク:
```bash
supabase link --project-ref <your-project-ref>
```
※ project-refはSupabase Dashboard → Project Settings → General → Reference IDで確認

4. マイグレーションを適用:
```bash
supabase db push
```

## 確認方法

マイグレーションが正しく適用されたか確認するには：

### 1. テーブルの確認

Supabase Dashboard → Table Editorで以下のテーブルが存在することを確認:
- ✅ profiles
- ✅ twitch_accounts
- ✅ x_connections
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

### 2. トリガーの確認

SQL Editorで実行:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

以下のトリガーが存在することを確認:
- `on_auth_user_created` on `auth.users`
- `user_settings_updated_at` on `user_settings`

### 3. 関数の確認

SQL Editorで実行:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';
```

以下の関数が存在することを確認:
- `handle_new_user()`
- `init_user_quota()`
- `consume_quota()`
- `update_updated_at()`

## テストユーザーでの動作確認

新規ユーザーを作成して、デフォルトテンプレートが自動作成されるか確認:

1. アプリにアクセス: http://localhost:3000/login
2. 「Twitchでログイン」をクリック
3. Twitchで認証
4. Supabase Dashboard → Table Editor → templatesを開く
5. 新規ユーザーのテンプレートA/Bが作成されていることを確認

## トラブルシューティング

### エラー: "relation does not exist"
→ マイグレーションの順番が間違っている可能性があります。initial_schemaから順に実行してください。

### エラー: "permission denied"
→ Service Roleキーを使用しているか確認してください（`SUPABASE_SERVICE_ROLE_KEY`）。

### トリガーが動作しない
→ SQL Editorで以下を実行して確認:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### RLSポリシーエラー
→ 開発中は一時的にRLSを無効化できます:
```sql
ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
```
※本番環境では必ず有効化してください

## 次のステップ

データベースセットアップが完了したら:

1. ✅ アプリケーションを起動: `npm run dev`
2. ✅ Twitchログインをテスト
3. ✅ X連携をテスト
4. ✅ EventSub Webhookを設定
5. ✅ Web Push通知をテスト

詳細は `docs/setup/external-services.md` を参照してください。
