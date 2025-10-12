# X (Twitter) OAuth 2.0 設定ガイド

このガイドでは、CastCueでX (Twitter) APIを使用するための完全なOAuth 2.0設定手順を説明します。

---

## 📋 前提条件

- X (Twitter) アカウント
- X Developer Portal へのアクセス権限
- 開発サーバーが起動していること（`npm run dev`）

---

## 🔧 Step 1: X Developer Portal でアプリを作成

### 1-1. Developer Portal にアクセス

```
https://developer.twitter.com/en/portal/dashboard
```

ログインして "Projects & Apps" セクションに移動します。

### 1-2. 新しいプロジェクトを作成

1. **"+ Create Project" をクリック**

2. **プロジェクト情報を入力**:
   ```
   Name: CastCue
   Use case: Making a bot（または他の適切なカテゴリ）
   Description: Stream notification bot for Twitch streamers
   ```

3. **アプリケーション環境を選択**:
   - Development（開発環境）を選択
   - 本番環境では Production に変更

### 1-3. アプリを作成

1. **App name を入力**:
   ```
   App name: CastCue Development
   ```

2. **API Keys が表示される**:
   - API Key（後で使用しません）
   - API Secret Key（後で使用しません）
   - Bearer Token（後で使用しません）

   ⚠️ この画面の値は **OAuth 2.0 では使用しません**。次のステップでOAuth 2.0の認証情報を取得します。

---

## 🔑 Step 2: OAuth 2.0 を設定

### 2-1. User authentication settings を編集

1. アプリの詳細ページで **"Set up"** をクリック（User authentication settingsセクション）

2. **App permissions を選択**:
   ```
   ✅ Read and write（必須）
   ```

   ⚠️ "Read only" では投稿できません。必ず "Read and write" を選択してください。

3. **Type of App を選択**:
   ```
   ✅ Web App
   ```

### 2-2. App info を入力

#### Callback URI / Redirect URL

開発環境と本番環境の両方を設定：

```
http://localhost:3010/api/x/oauth/callback
https://castcue.com/api/x/oauth/callback
```

⚠️ **重要**:
- 末尾のスラッシュなし
- プロトコル（http/https）も含める
- ポート番号も正確に
- 複数のURLを設定する場合は改行で区切る

#### Website URL

```
https://castcue.com
```

または開発環境の場合：
```
http://localhost:3010
```

#### Organization name（オプション）

```
CastCue
```

#### Organization URL（オプション）

```
https://castcue.com
```

#### Terms of service URL（オプション）

後で設定可能。本番環境では必須。

#### Privacy policy URL（オプション）

後で設定可能。本番環境では必須。

### 2-3. OAuth 2.0 認証情報を取得

設定を保存すると、**OAuth 2.0 の認証情報**が表示されます：

```
Client ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Client Secret: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

⚠️ **この値をコピーして安全に保管してください**

---

## 🔐 Step 3: 環境変数を設定

### 3-1. .env.local を編集

プロジェクトルートの `.env.local` ファイルを開いて、以下を更新：

```bash
# X (Twitter)
X_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X_CLIENT_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
X_REDIRECT_URI=${APP_ORIGIN}/api/x/oauth/callback
```

**実際の値に置き換え**:
```bash
# X (Twitter)
X_CLIENT_ID=V0ZUWVQ5ektYS0FrOXFuRm5NUW06MTpjaQ
X_CLIENT_SECRET=MHhGSDJtbjhCLVo3Nm05WF9BMlIzMXlRYUJNQkxCLUVjN0h6cVlHNzJfUQ
X_REDIRECT_URI=${APP_ORIGIN}/api/x/oauth/callback
```

### 3-2. APP_ORIGIN を確認

開発環境では：
```bash
APP_ORIGIN=http://localhost:3010
```

本番環境では：
```bash
APP_ORIGIN=https://castcue.com
```

### 3-3. サーバーを再起動

環境変数を変更したら、必ずサーバーを再起動：

```bash
# Ctrl + C で停止
npm run dev
```

---

## ✅ Step 4: 動作確認

### 4-1. ログイン

1. ブラウザで開く：
   ```
   http://localhost:3010/login
   ```

2. Twitchでログイン（まずTwitch認証が必要）

### 4-2. X連携ページにアクセス

```
http://localhost:3010/integrations
```

### 4-3. X連携を実行

1. **"連携する" ボタンをクリック**

2. **X認証画面が表示される**:
   - アプリ名: CastCue Development
   - 権限: Read and write tweets
   - "Authorize app" をクリック

3. **連携成功**:
   - リダイレクトされて `/integrations` に戻る
   - X連携カードのステータスが "接続済み" になる
   - アカウント情報が表示される

### 4-4. エラーが発生した場合

#### エラー: "Callback URL not approved"

**原因**: Redirect URLが正しく設定されていない

**解決**:
1. X Developer Portal でRedirect URLを確認
2. `http://localhost:3010/api/x/oauth/callback` が設定されているか確認
3. プロトコル（http）、ポート番号（3010）が一致しているか確認

#### エラー: "Invalid client credentials"

**原因**: Client ID または Client Secret が間違っている

**解決**:
1. `.env.local` の値を再確認
2. X Developer Portal の値と一致しているか確認
3. コピー時の空白文字や改行が含まれていないか確認
4. サーバーを再起動

#### エラー: "App does not have write permissions"

**原因**: App permissions が "Read only" になっている

**解決**:
1. X Developer Portal → User authentication settings
2. App permissions を "Read and write" に変更
3. **ユーザーの再認証が必要**（連携解除して再度連携）

---

## 🧪 Step 5: ツイート投稿テスト

### 5-1. テスト投稿用のスクリプト

以下のスクリプトで投稿テスト（オプション）：

```bash
# まず、X連携を完了させる（上記手順）
# その後、ブラウザのコンソールで：
```

```javascript
// ブラウザのコンソールで実行
fetch('/api/x/test-post', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'CastCue テスト投稿 - OAuth 2.0 設定完了！'
  })
}).then(r => r.json()).then(console.log);
```

### 5-2. 本番での投稿フロー

1. **Twitch配信を開始**

2. **EventSub Webhookがトリガー**
   - 下書きが作成される
   - Web Push通知が送信される

3. **通知のボタンをクリック**
   - "テンプレートで投稿" → 自動投稿
   - "編集して投稿" → 編集ページで手動投稿

4. **X に投稿される**
   - 短縮URLが自動生成
   - サンプリングが開始される

---

## 📊 Step 6: Scope（権限）の説明

CastCueが要求する権限：

| Scope | 用途 |
|-------|------|
| `tweet.read` | ユーザー情報取得 |
| `tweet.write` | ツイート投稿 |
| `users.read` | プロフィール表示 |
| `offline.access` | リフレッシュトークン |

これらの権限は `lib/x.ts` で定義されています：

```typescript
const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
```

---

## 🔒 セキュリティ確認

### トークンの暗号化

X APIのアクセストークンは **AES-256-GCM** で暗号化されて保存されます：

- 暗号化キー: `DATA_ENCRYPTION_KEY`（`.env.local`）
- 保存先: `x_connections` テーブル
- フィールド: `access_token_cipher`, `refresh_token_cipher`

### トークンの自動リフレッシュ

アクセストークンは2時間で有効期限が切れますが、`lib/x.ts` の `getUserAccessToken()` が自動でリフレッシュします。

---

## 🚨 トラブルシューティング

### 問題: 連携ボタンを押しても何も起きない

**確認項目**:
1. ブラウザのコンソールにエラーが表示されていないか
2. `/api/x/oauth/start` にリクエストが送信されているか
3. 環境変数が正しく設定されているか

**解決**:
```bash
# サーバーログを確認
# ターミナルでエラーが表示されていないか確認
```

### 問題: X側で "Error: Callback URL not whitelisted"

**原因**: Developer Portal の設定とアプリの設定が不一致

**解決**:
1. `.env.local` の `APP_ORIGIN` を確認
2. X Developer Portal の Callback URI を確認
3. 完全一致しているか確認（プロトコル、ポート、パスすべて）

### 問題: リフレッシュトークンが機能しない

**原因**: `offline.access` スコープが含まれていない

**解決**:
1. `lib/x.ts` で scopes 配列を確認
2. `offline.access` が含まれているか確認
3. **ユーザーの再認証が必要**

---

## 📝 本番環境への移行

### 1. X Developer Portal で本番用アプリを作成

開発用とは別に本番用のアプリを作成することを推奨：

```
App name: CastCue Production
Environment: Production
```

### 2. 本番環境のCallback URLを設定

```
https://castcue.com/api/x/oauth/callback
```

⚠️ `http://localhost` は削除

### 3. 本番環境の環境変数を設定

Vercelの環境変数に設定：

```bash
X_CLIENT_ID=<本番用Client ID>
X_CLIENT_SECRET=<本番用Client Secret>
APP_ORIGIN=https://castcue.com
```

### 4. Terms of Service と Privacy Policy

本番環境では必須：

- Terms of Service URL: `https://castcue.com/terms`
- Privacy Policy URL: `https://castcue.com/privacy`

これらのページを作成してURLを設定してください。

---

## ✅ チェックリスト

設定完了前に以下を確認：

- [ ] X Developer Portal でアプリ作成
- [ ] App permissions を "Read and write" に設定
- [ ] Callback URI を設定（開発・本番両方）
- [ ] OAuth 2.0 Client ID/Secret を取得
- [ ] `.env.local` に設定
- [ ] サーバー再起動
- [ ] `/integrations` で連携テスト
- [ ] ツイート投稿テスト（オプション）
- [ ] トークンが暗号化されて保存されることを確認

---

## 📚 参考リンク

- [X API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [OAuth 2.0 Authorization Code Flow with PKCE](https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code)
- [CastCue - lib/x.ts](../../lib/x.ts) - X API実装
- [CastCue - app/api/x/oauth](../../app/api/x/oauth/) - OAuth エンドポイント

---

最終更新: 2025-10-12
作成者: Claude Code
