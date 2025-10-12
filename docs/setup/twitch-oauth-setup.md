# Twitch OAuth ログイン設定ガイド

このガイドでは、CastCueでTwitchアカウントによるログインを有効化する手順を説明します。

---

## 📋 前提条件

- Twitch Developer アカウント
- Supabase プロジェクトへのアクセス権限
- CastCueのSupabaseプロジェクトID: `uisfgmijyzbqcqvvafxc`

---

## 🎯 概要

CastCueでは、**Twitch OAuth** を使用してユーザーがログインします。

### 認証フロー

```
1. ユーザーが /login にアクセス
   ↓
2. "Twitchでログイン" ボタンをクリック
   ↓
3. Supabase Auth → Twitch OAuth画面
   ↓
4. ユーザーがTwitchで認証
   ↓
5. Supabase Auth → /auth/callback
   ↓
6. プロフィール作成・同期 → /dashboard
```

---

## 🔧 Step 1: Twitch Developer Console で設定確認

### 1-1. Twitch Developer Console にアクセス

```
https://dev.twitch.tv/console/apps
```

### 1-2. 既存のアプリケーションを確認

現在の `.env.local` には以下の値が設定されています：

```bash
TWITCH_CLIENT_ID=1e5e6fs1dxgsjc3b1oeyr326513w6o
TWITCH_CLIENT_SECRET=7roj0koxwow26tfirbwh9nz85498x1
```

この値に対応するアプリケーションを確認します。

### 1-3. OAuth Redirect URLs を確認

アプリケーションの設定で、以下のURLが登録されているか確認：

**開発環境用**:
```
http://localhost:3010/auth/callback
```

**Supabase Auth用**（最重要）:
```
https://uisfgmijyzbqcqvvafxc.supabase.co/auth/v1/callback
```

**本番環境用**:
```
https://castcue.com/auth/callback
```

⚠️ **重要**: Supabase Auth を使用する場合、Redirect URLは必ず Supabase の callback URL である必要があります。

### 1-4. Client Secret を確認

もし Client Secret が不明な場合：

1. "New Secret" ボタンをクリック
2. 新しいSecretが生成される
3. `.env.local` の `TWITCH_CLIENT_SECRET` を更新
4. サーバーを再起動

---

## 🔐 Step 2: Supabase Auth でTwitch Providerを有効化

### 2-1. Supabase Dashboard にアクセス

```
https://app.supabase.com/project/uisfgmijyzbqcqvvafxc/auth/providers
```

### 2-2. Twitch Provider を探す

1. Providers リストから "Twitch" を検索

2. "Twitch" をクリックして設定画面を開く

### 2-3. Twitch Provider を有効化

以下の設定を行います：

#### Enable Sign in with Twitch

```
✅ Enabled
```

#### Twitch Client ID

`.env.local` の値をコピー：
```
1e5e6fs1dxgsjc3b1oeyr326513w6o
```

#### Twitch Client Secret

`.env.local` の値をコピー：
```
7roj0koxwow26tfirbwh9nz85498x1
```

#### Redirect URL（自動設定）

Supabaseが自動的に以下のURLを設定します：
```
https://uisfgmijyzbqcqvvafxc.supabase.co/auth/v1/callback
```

⚠️ この値を Twitch Developer Console の OAuth Redirect URLs に追加してください（Step 1-3）

### 2-4. 保存

"Save" ボタンをクリックして設定を保存します。

---

## 🔄 Step 3: Twitch Developer Console で Redirect URL を追加

### 3-1. Twitch アプリ設定に戻る

```
https://dev.twitch.tv/console/apps
```

### 3-2. OAuth Redirect URLs を編集

"Manage" → アプリケーションを選択 → OAuth Redirect URLs セクション

### 3-3. Supabase Callback URL を追加

以下のURLを追加（まだ追加していない場合）：

```
https://uisfgmijyzbqcqvvafxc.supabase.co/auth/v1/callback
```

⚠️ **正確にコピーしてください**:
- プロトコル: `https://`
- ドメイン: `uisfgmijyzbqcqvvafxc.supabase.co`
- パス: `/auth/v1/callback`
- 末尾のスラッシュなし

### 3-4. その他のRedirect URLsも確認

開発・本番環境用のURLも追加：

```
http://localhost:3010/auth/callback
https://castcue.com/auth/callback
```

⚠️ ただし、Supabase Auth を使用する場合、実際に使用されるのは Supabase の callback URL のみです。

### 3-5. 保存

"Add" → "Save" をクリックして設定を保存します。

---

## ✅ Step 4: 動作確認

### 4-1. ログインページにアクセス

```
http://localhost:3010/login
```

### 4-2. ログインフローをテスト

1. **"Twitchでログイン" ボタンをクリック**

2. **Twitch認証画面が表示される**:
   - アプリ名が表示される
   - 要求される権限が表示される
   - "Authorize" ボタンをクリック

3. **認証成功**:
   - Supabase Auth が認証を処理
   - `/auth/callback` にリダイレクト
   - さらに `/dashboard` にリダイレクト

4. **プロフィール確認**:
   - `/settings` ページにアクセス
   - プロフィールセクションにTwitch情報が表示される

### 4-3. 新規ユーザーの場合

初めてログインする場合、自動的に以下が作成されます：

- ✅ `profiles` レコード（Twitch情報）
- ✅ `quotas` レコード（12/月の割当）
- ✅ `templates` レコード（デフォルトA/B）
- ✅ `user_settings` レコード（デフォルト設定）

これは `handle_new_user()` トリガー関数が自動的に実行します。

### 4-4. エラーが発生した場合

#### エラー: "Invalid OAuth redirect URI"

**原因**: Redirect URLが一致していない

**解決**:
1. Twitch Developer Console の Redirect URLs を確認
2. Supabase の callback URL が追加されているか確認
3. タイポがないか確認

#### エラー: "Authorization failed"

**原因**: Client ID または Client Secret が間違っている

**解決**:
1. Supabase Dashboard の Twitch Provider設定を確認
2. `.env.local` の値と一致しているか確認
3. Twitch Developer Console で Client Secret を再生成

#### エラー: プロフィールが作成されない

**原因**: `handle_new_user()` トリガーが動作していない

**解決**:
```bash
# データベース確認スクリプトを実行
node scripts/check-database.js
node scripts/check-functions.js

# トリガーが存在するか確認
```

---

## 🔍 Step 5: プロフィール同期の確認

### 5-1. プロフィールテーブルの確認

ログイン後、データベースに以下の情報が保存されます：

```sql
SELECT * FROM profiles WHERE user_id = '<your-user-id>';
```

**フィールド**:
- `twitch_user_id` - Twitch ID
- `login` - Twitchユーザー名
- `display_name` - 表示名
- `profile_image_url` - プロフィール画像URL
- `broadcaster_type` - 配信者タイプ（partner/affiliate/none）
- `email` - メールアドレス

### 5-2. 設定ページで確認

```
http://localhost:3010/settings
```

プロフィールセクションに以下が表示されることを確認：
- プロフィール画像
- 表示名
- ユーザー名
- Twitch ID
- 配信者タイプ

---

## 🚨 トラブルシューティング

### 問題: ログインボタンを押しても何も起きない

**確認項目**:
1. ブラウザのコンソールにエラーが表示されていないか
2. Supabase Auth が有効になっているか
3. 環境変数が正しく設定されているか

**解決**:
```bash
# .env.local を確認
cat .env.local | grep SUPABASE

# サーバーを再起動
npm run dev
```

### 問題: "Error: Invalid provider"

**原因**: Supabase Auth で Twitch Provider が有効化されていない

**解決**:
1. https://app.supabase.com/project/uisfgmijyzbqcqvvafxc/auth/providers
2. Twitch Provider を有効化
3. Client ID/Secret を設定

### 問題: 認証後、ダッシュボードではなくエラーページに飛ぶ

**原因**: Callback処理でエラーが発生している

**解決**:
1. `/app/auth/callback/route.ts` のログを確認
2. データベース接続を確認
3. RLSポリシーを確認

---

## 📝 Supabase Auth の仕組み

### OAuth Flow（Supabase経由）

```
1. ユーザー → supabase.auth.signInWithOAuth({ provider: 'twitch' })
   ↓
2. Supabase Auth → Twitch OAuth画面
   ↓
3. ユーザー認証 → Twitch
   ↓
4. Twitch → Supabase Auth (callback)
   ↓
5. Supabase Auth → アプリの /auth/callback
   ↓
6. セッション作成 → Cookie保存
   ↓
7. リダイレクト → /dashboard
```

### セッション管理

Supabaseはセッションを以下に保存：
- Cookie（サーバー側）: `@supabase/ssr`
- LocalStorage（クライアント側）: `@supabase/supabase-js`

セッションの有効期限は1時間（デフォルト）。自動的にリフレッシュされます。

---

## 🌐 本番環境への移行

### 1. 本番用Redirect URLを追加

Twitch Developer Console で：

```
https://castcue.com/auth/callback
```

ただし、Supabase Auth経由の場合は不要（Supabaseのcallback URLのみ必要）。

### 2. Supabase本番環境の設定

本番用のSupabaseプロジェクトがある場合：

```
https://<production-project-id>.supabase.co/auth/v1/callback
```

このURLをTwitch Developer Consoleに追加。

### 3. 環境変数の確認

Vercelの環境変数に以下が設定されていることを確認：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://uisfgmijyzbqcqvvafxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
TWITCH_CLIENT_ID=<client-id>
TWITCH_CLIENT_SECRET=<client-secret>
```

---

## ✅ チェックリスト

設定完了前に以下を確認：

- [ ] Twitch Developer Console でアプリ確認
- [ ] Supabase callback URL を Redirect URLs に追加
- [ ] Supabase Dashboard で Twitch Provider有効化
- [ ] Client ID/Secret を正しく設定
- [ ] `/login` でログインテスト
- [ ] プロフィールが正しく作成されることを確認
- [ ] `/settings` でプロフィール表示確認
- [ ] デフォルトテンプレートA/Bが作成されることを確認

---

## 📚 参考リンク

- [Twitch Authentication](https://dev.twitch.tv/docs/authentication/)
- [Supabase Auth with Twitch](https://supabase.com/docs/guides/auth/social-login/auth-twitch)
- [CastCue - app/login/page.tsx](../../app/login/page.tsx) - ログインページ
- [CastCue - app/auth/callback/route.ts](../../app/auth/callback/route.ts) - Callback処理

---

最終更新: 2025-10-12
作成者: Claude Code
