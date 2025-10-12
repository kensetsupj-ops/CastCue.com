# CastCue セットアップガイド

このガイドでは、CastCueを完全に動作させるための設定手順を説明します。

---

## ✅ 完了済み

- [x] データベーステーブル作成（全15テーブル）
- [x] RLSポリシー設定
- [x] データベース関数とトリガー
- [x] 開発サーバー起動 (`http://localhost:3010`)

---

## 🔧 必要な設定

### 1. Twitch OAuth 設定（ログイン機能）

#### Supabase Dashboard での設定

1. **Supabase Dashboard にアクセス**
   ```
   https://app.supabase.com/project/uisfgmijyzbqcqvvafxc/auth/providers
   ```

2. **Twitch Provider を有効化**
   - "Twitch" を検索して選択
   - "Enable Sign in with Twitch" をON

3. **Twitch アプリ情報を入力**

   現在の `.env.local` の情報を使用：
   ```
   Client ID: 1e5e6fs1dxgsjc3b1oeyr326513w6o
   Client Secret: 7roj0koxwow26tfirbwh9nz85498x1
   ```

4. **Redirect URL を確認**

   自動的に以下が設定されます：
   ```
   https://uisfgmijyzbqcqvvafxc.supabase.co/auth/v1/callback
   ```

5. **Twitch Developer Console で Redirect URL を更新**

   - https://dev.twitch.tv/console/apps にアクセス
   - アプリケーションを選択
   - "OAuth リダイレクト URL" に以下を追加：
     ```
     https://uisfgmijyzbqcqvvafxc.supabase.co/auth/v1/callback
     http://localhost:3010/auth/callback
     ```

#### 動作確認

1. `http://localhost:3010/login` にアクセス
2. "Twitchでログイン" ボタンをクリック
3. Twitch認証画面が表示されることを確認
4. 認証後、ダッシュボードにリダイレクトされることを確認

---

### 2. X (Twitter) OAuth 設定（ツイート投稿機能）

#### X Developer Portal での設定

1. **X Developer Portal にアクセス**
   ```
   https://developer.twitter.com/en/portal/dashboard
   ```

2. **新しいアプリを作成**
   - Project名: CastCue
   - App名: CastCue Production
   - Environment: Production

3. **OAuth 2.0 設定**

   - "User authentication settings" を編集
   - Type of App: **Web App**
   - App permissions: **Read and write**（ツイート投稿に必要）
   - Callback URI / Redirect URL:
     ```
     http://localhost:3010/api/x/oauth/callback
     https://castcue.com/api/x/oauth/callback
     ```
   - Website URL: `https://castcue.com`

4. **Client ID と Client Secret を取得**

   表示された値を `.env.local` に設定：
   ```bash
   X_CLIENT_ID=your-actual-client-id
   X_CLIENT_SECRET=your-actual-client-secret
   ```

5. **開発サーバーを再起動**
   ```bash
   # Ctrl+C で停止
   npm run dev
   ```

#### 動作確認

1. `http://localhost:3010/integrations` にアクセス
2. X連携カードの "連携する" ボタンをクリック
3. X認証画面が表示されることを確認
4. 認証後、連携状態が "接続済み" になることを確認

---

### 3. Twitch EventSub Webhook 設定

#### 開発環境での設定

開発環境では、Cloudflare Tunnel または ngrok を使用して公開URLを取得する必要があります。

##### Option A: Cloudflare Tunnel（推奨）

1. **Cloudflare Tunnel をインストール**
   ```bash
   # Windows
   winget install Cloudflare.cloudflared
   ```

2. **トンネルを起動**
   ```bash
   cloudflared tunnel --url http://localhost:3010
   ```

3. **表示された公開URLをメモ**
   ```
   例: https://random-string.trycloudflare.com
   ```

##### Option B: ngrok

1. **ngrok をインストール**
   ```bash
   # https://ngrok.com/download
   ```

2. **トンネルを起動**
   ```bash
   ngrok http 3010
   ```

3. **表示された公開URLをメモ**
   ```
   例: https://abc123.ngrok.io
   ```

#### Twitch EventSub 購読の作成

1. **公開URLを環境変数に設定**

   `.env.local` を更新：
   ```bash
   APP_ORIGIN=https://your-public-url.trycloudflare.com
   ```

2. **サーバーを再起動**
   ```bash
   npm run dev
   ```

3. **EventSub 購読を作成**

   以下のAPIを呼び出し（Postman等を使用）：
   ```
   POST http://localhost:3010/api/twitch/subscribe
   Content-Type: application/json

   {
     "user_id": "your-supabase-user-id"
   }
   ```

4. **Twitch Console で確認**
   ```
   https://dev.twitch.tv/console/extensions
   ```

---

### 4. Web Push 通知設定

#### Service Worker の登録UI実装

現在、設定ページにWeb Push設定ボタンはありますが、動作していません。実装が必要です。

##### 実装するファイル

1. **`app/(dashboard)/settings/page.tsx`**

   Web Push購読ボタンの動作を実装：
   ```typescript
   const handleEnablePush = async () => {
     try {
       // Service Worker登録
       const registration = await navigator.serviceWorker.register('/sw.js');

       // 通知権限をリクエスト
       const permission = await Notification.requestPermission();

       if (permission === 'granted') {
         // VAPID公開鍵を使って購読
         const subscription = await registration.pushManager.subscribe({
           userVisibleOnly: true,
           applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
         });

         // サーバーに購読情報を送信
         await fetch('/api/push/register', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(subscription)
         });

         alert('通知が有効になりました！');
       }
     } catch (error) {
       console.error('Push notification error:', error);
       alert('通知の有効化に失敗しました');
     }
   };
   ```

2. **通知状態の表示**

   ページ読み込み時に現在の状態を確認：
   ```typescript
   const [pushEnabled, setPushEnabled] = useState(false);

   useEffect(() => {
     const checkPushStatus = async () => {
       if ('serviceWorker' in navigator && 'PushManager' in window) {
         const registration = await navigator.serviceWorker.getRegistration();
         const subscription = await registration?.pushManager.getSubscription();
         setPushEnabled(!!subscription);
       }
     };
     checkPushStatus();
   }, []);
   ```

---

## 🎯 次のアクション

### 優先順位1: 認証機能を完成させる

1. **Twitch OAuth設定を完了**
   - Supabase Dashboardで設定
   - ログイン動作確認

2. **X OAuth設定を完了**
   - X Developer Portalでアプリ作成
   - 連携動作確認

### 優先順位2: 通知機能を完成させる

3. **Web Push UI実装**
   - 設定ページの購読ボタン実装
   - 通知状態表示

4. **EventSub Webhook設定**
   - Cloudflare Tunnelで公開URL取得
   - 購読作成とテスト

### 優先順位3: 本番デプロイ

5. **Vercel デプロイ**
   - プロジェクト作成
   - 環境変数設定
   - DNS設定 (castcue.com)

---

## 📋 環境変数チェックリスト

現在の `.env.local` の状態：

- ✅ `NEXT_PUBLIC_SUPABASE_URL` - 設定済み
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 設定済み
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - 設定済み
- ✅ `TWITCH_CLIENT_ID` - 設定済み
- ✅ `TWITCH_CLIENT_SECRET` - 設定済み
- ✅ `TWITCH_WEBHOOK_SECRET` - 設定済み
- ❌ `X_CLIENT_ID` - **要設定**
- ❌ `X_CLIENT_SECRET` - **要設定**
- ✅ `VAPID_PUBLIC_KEY` - 設定済み
- ✅ `VAPID_PRIVATE_KEY` - 設定済み
- ✅ `DATA_ENCRYPTION_KEY` - 設定済み
- ⚠️  `APP_ORIGIN` - 本番URL設定が必要

---

## 🧪 テスト手順

### 1. ログイン機能のテスト

```bash
# 開発サーバー起動
npm run dev

# ブラウザで開く
http://localhost:3010/login
```

### 2. 連携機能のテスト

```bash
# X連携ページ
http://localhost:3010/integrations
```

### 3. ダッシュボードのテスト

```bash
# ダッシュボード
http://localhost:3010/dashboard
```

---

## 🐛 トラブルシューティング

### ポート3000が使用中

```bash
# ポート3010に変更される（自動）
⚠ Port 3000 is in use, using 3010 instead
```

### データベース接続エラー

```bash
# データベース確認スクリプトを実行
node scripts/check-database.js
```

### OAuth認証エラー

1. Redirect URLが正しく設定されているか確認
2. Client IDとSecretが一致しているか確認
3. 環境変数の再読み込み（サーバー再起動）

---

## 📞 サポート

問題が発生した場合は、以下のドキュメントを参照してください：

- `docs/setup/env-variables.md` - 環境変数の詳細
- `docs/setup/external-services.md` - 外部サービス設定
- `docs/development/troubleshooting.md` - トラブルシューティング
- `DATABASE_SETUP_COMPLETE.md` - データベース設定詳細

---

最終更新: 2025-10-12
開発サーバー: http://localhost:3010
