# トラブルシューティングガイド

開発中によく遭遇する問題と解決方法。

## 環境構築関連

### npm install でエラーが出る

**症状:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**解決策:**
```bash
# node_modules削除
rm -rf node_modules package-lock.json

# クリーンインストール
npm install

# それでもダメなら
npm install --legacy-peer-deps
```

---

### 開発サーバーが起動しない

**症状:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決策:**
```bash
# ポート3000を使用しているプロセスを確認
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# または別のポートを使用
npm run dev -- -p 3001
```

---

### 開発サーバーの推奨起動方法（Windows）

**背景:**
Windows環境では、システム環境変数が `.env.local` よりも優先されるため、古いSupabaseキーがキャッシュされていると環境変数の読み込みで問題が発生する場合があります。

**推奨起動コマンド（Windows）:**

```bash
# PowerShell経由で環境変数をクリアしてから起動（推奨）
powershell -Command "Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue; npm run dev"
```

**通常起動（Mac/Linux、またはWindows環境変数問題がない場合）:**

```bash
npm run dev
```

**理由:**
- このコマンドは起動前にSupabaseのService Role Keyをセッション環境変数から削除します
- `.env.local` の値が確実に読み込まれます
- 既にシステム環境変数を削除済みの場合は、新しいターミナルで `npm run dev` だけでも動作します

**確認方法:**

開発サーバー起動後、ブラウザで `http://localhost:3000` にアクセスし、コンソールにエラーが出ないことを確認してください。

---

## Supabase関連

### "Invalid API key" (環境変数が正しいのにエラー)

**症状:**
```
Error: Invalid API key
Hint: Double check your Supabase `anon` or `service_role` API key.
```

`.env.local` に正しいキーが設定されているのにエラーが発生する。

**根本原因:**
Supabaseクライアントを**モジュールレベル（ファイルのトップ）で初期化**していると、環境変数が正しく読み込まれる前にクライアントが作成される。

**悪い例:**
```typescript
// ❌ モジュールレベルで初期化 - 環境変数が読み込まれる前に実行される
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // supabaseAdmin を使用
}
```

**良い例:**
```typescript
// ✅ 関数内で初期化 - 環境変数が確実に読み込まれた後に実行される
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // supabaseAdmin を使用
}
```

**解決策:**
1. **すべてのAPI routeファイルを確認:**
   ```bash
   # 影響を受けるファイル
   app/api/reports/route.ts
   app/api/dashboard/route.ts
   app/api/streams/route.ts
   app/api/settings/route.ts
   ```

2. **クライアント初期化を関数内に移動:**
   - モジュールレベルの `const supabaseAdmin = ...` を削除
   - 各関数（GET, POST, PUT等）の最初で初期化

3. **`.next` キャッシュをクリア:**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **環境変数が正しく読み込まれているか確認:**
   ```typescript
   // デバッグ用（本番では削除）
   console.log('Service Key suffix:',
     process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-4)
   );
   // 期待値: ".env.local" のキーの末尾4文字と一致
   ```

5. **システム環境変数のチェック（重要）:**

   Windows のシステム環境変数に古い Supabase キーが設定されていると、`.env.local` の値が上書きされます。

   ```bash
   # システム環境変数を確認（Windows）
   echo $SUPABASE_SERVICE_ROLE_KEY

   # 末尾4文字が .env.local と異なる場合、システム環境変数を削除:
   REG delete "HKCU\Environment" /F /V SUPABASE_SERVICE_ROLE_KEY

   # または PowerShell で:
   [Environment]::SetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY", $null, "User")
   ```

   削除後、開発サーバーを再起動：
   ```bash
   rm -rf .next
   npm run dev
   ```

**参考:**
- この問題は Next.js 15 の環境変数読み込みタイミングに関連しています。
- Node.js は**システム環境変数を `.env.local` より優先**するため、古い値が残っていると問題が発生します。

---

### "Invalid Supabase URL"

**症状:**
```
Error: Missing Supabase environment variables
```

**解決策:**
1. `.env.local` が存在するか確認
2. `NEXT_PUBLIC_SUPABASE_URL` の形式確認:
   ```
   https://xxxxx.supabase.co
   ```
3. 開発サーバー再起動:
   ```bash
   # Ctrl+C で停止
   npm run dev
   ```

---

### RLS (Row Level Security) エラー

**症状:**
```
new row violates row-level security policy for table "x_connections"
```

**解決策:**

1. **一時的な回避（開発環境のみ）:**
   ```sql
   -- Supabase SQL Editor
   ALTER TABLE x_connections DISABLE ROW LEVEL SECURITY;
   ```

2. **正しいポリシー設定:**
   ```sql
   ALTER TABLE x_connections ENABLE ROW LEVEL SECURITY;

   -- 自分のレコードのみ表示
   CREATE POLICY "Users can view own connections"
     ON x_connections FOR SELECT
     USING (auth.uid() = user_id);

   -- 自分のレコードのみ挿入
   CREATE POLICY "Users can insert own connections"
     ON x_connections FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   -- 自分のレコードのみ更新
   CREATE POLICY "Users can update own connections"
     ON x_connections FOR UPDATE
     USING (auth.uid() = user_id);
   ```

---

## Twitch API関連

### Webhook が届かない

**症状:**
通知が来ない、Webhookエンドポイントが呼ばれない。

**チェックリスト:**
1. **ngrok/Cloudflare Tunnel が起動しているか:**
   ```bash
   # ngrokの場合
   ngrok http 3000

   # Cloudflare Tunnelの場合
   cloudflared tunnel run castcue-dev
   ```

2. **Webhook URLが正しいか:**
   ```
   https://your-tunnel.ngrok.io/api/twitch/webhook
   ```

3. **Twitch Developer Consoleで確認:**
   - https://dev.twitch.tv/console
   - EventSub → Subscriptions
   - Status が "enabled" になっているか

4. **署名検証の確認:**
   ```typescript
   // app/api/twitch/webhook/route.ts
   console.log('TWITCH_WEBHOOK_SECRET:', process.env.TWITCH_WEBHOOK_SECRET);
   ```

**デバッグ方法:**
```bash
# ログ確認
npm run dev

# 別ターミナルでテスト
curl -X POST http://localhost:3000/api/twitch/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

### "401 Unauthorized" エラー

**症状:**
```
Twitch API returned 401: Unauthorized
```

**解決策:**
1. **Client ID/Secret確認:**
   ```bash
   # .env.local
   TWITCH_CLIENT_ID=確認
   TWITCH_CLIENT_SECRET=確認
   ```

2. **App Access Token取得テスト:**
   ```bash
   curl -X POST 'https://id.twitch.tv/oauth2/token' \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "grant_type=client_credentials"
   ```

---

## X (Twitter) API関連

### OAuth認証が失敗する

**症状:**
```
Error: invalid_request
The redirect_uri parameter does not match
```

**解決策:**
1. **Callback URI完全一致確認:**
   ```
   X Developer Portal: http://localhost:3000/api/x/oauth/callback
   .env.local: http://localhost:3000/api/x/oauth/callback

   ポート番号、末尾のスラッシュまで完全一致
   ```

2. **localhostが使えない場合:**
   ```
   開発環境URL: https://dev.castcue.com/api/x/oauth/callback
   ```

3. **OAuth 2.0が有効か確認:**
   - X Developer Portal → App Settings
   - User authentication settings → OAuth 2.0

---

### "403 Forbidden" (ツイート投稿失敗)

**症状:**
```
X API returned 403: Forbidden
You are not allowed to create a Tweet with this access level
```

**解決策:**
1. **App permissions確認:**
   - X Developer Portal → Settings
   - User authentication settings → App permissions
   - **"Read and write"** になっているか確認

2. **再認証が必要:**
   ```
   App permissionsを変更した場合、ユーザーは再度認証が必要

   1. /integrations でX連携を解除
   2. 再度X連携
   ```

---

### Token Refresh エラー

**症状:**
```
Error refreshing token: invalid_grant
```

**解決策:**
1. **refresh_tokenが期限切れ:**
   ```
   ユーザーに再認証してもらう必要がある
   ```

2. **offline.access スコープ確認:**
   ```typescript
   // lib/x.ts
   scope: "tweet.write tweet.read users.read offline.access"
   ```

---

## Web Push関連

### 通知が届かない

**症状:**
プッシュ通知が表示されない。

**チェックリスト:**
1. **Service Worker登録確認:**
   ```javascript
   // ブラウザのDevTools → Application → Service Workers
   Status: activated
   ```

2. **Push購読状態確認:**
   ```javascript
   // Console
   navigator.serviceWorker.ready.then(reg => {
     reg.pushManager.getSubscription().then(sub => {
       console.log('Subscription:', sub);
     });
   });
   ```

3. **VAPID keys確認:**
   ```bash
   # .env.local
   VAPID_PUBLIC_KEY=確認
   VAPID_PRIVATE_KEY=確認
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=確認（Public Keyと同じ）
   ```

4. **ブラウザ通知許可:**
   ```
   Chrome: 設定 → プライバシーとセキュリティ → サイトの設定 → 通知
   localhost が「許可」になっているか確認
   ```

---

### "410 Gone" エラー

**症状:**
```
Push failed: 410 Gone
```

**解決策:**
このエラーは正常動作です。購読が無効になったため、自動で削除されます。

```typescript
// lib/push.ts - 既に実装済み
if (error.statusCode === 410 || error.statusCode === 404) {
  // 無効な購読を削除
  await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("id", subscription.id);
}
```

---

## 暗号化・復号化関連

### "Decryption failed"

**症状:**
```
Error: Unsupported state or unable to authenticate data
```

**原因:**
- `DATA_ENCRYPTION_KEY` が変更された
- 暗号化されたデータが破損

**解決策:**
1. **開発環境:**
   ```sql
   -- すべての暗号化データを削除
   DELETE FROM x_connections;

   -- ユーザーに再認証してもらう
   ```

2. **本番環境:**
   ```
   絶対にキーを変更しない！
   キーをバックアップしておく
   ```

---

## Short Link関連

### リダイレクトが動かない

**症状:**
`/l/abc123` にアクセスしてもリダイレクトしない。

**解決策:**
1. **ルートファイル確認:**
   ```
   app/l/[shortCode]/route.ts が存在するか
   ```

2. **ビルドエラー確認:**
   ```bash
   npm run build
   # エラーがないか確認
   ```

3. **デバッグ:**
   ```typescript
   // app/l/[shortCode]/route.ts
   export async function GET(req: NextRequest, { params }: any) {
     console.log('Short code:', params.shortCode);
     // ...
   }
   ```

---

## Sampling関連

### サンプリングが実行されない

**症状:**
`samples` テーブルにレコードが作成されない。

**チェックリスト:**
1. **Twitch API呼び出し確認:**
   ```typescript
   // lib/sampling.ts
   console.log('[sampling] Getting stream info:', streamId);
   const streamInfo = await twitchClient.getStream(stream.stream_id);
   console.log('[sampling] Stream info:', streamInfo);
   ```

2. **配信が実際に進行中か確認:**
   ```
   Twitchで配信が終了していると null が返る
   ```

3. **手動テスト:**
   ```bash
   curl -X POST http://localhost:3000/api/sampling \
     -H "Content-Type: application/json" \
     -d '{"stream_id": 1}'
   ```

---

## Vercel デプロイ関連

### ビルドエラー

**症状:**
```
Error: Build failed
```

**解決策:**
1. **ローカルでビルドテスト:**
   ```bash
   npm run build
   # エラー内容を確認
   ```

2. **環境変数確認:**
   ```
   Vercel Dashboard → Settings → Environment Variables
   すべての変数が設定されているか確認
   ```

3. **ログ確認:**
   ```bash
   vercel logs
   # デプロイログを確認
   ```

---

### 環境変数が読み込まれない

**症状:**
```
Missing environment variable: X_CLIENT_ID
```

**解決策:**
1. **Environment Variables設定:**
   ```
   Vercel Dashboard → Settings → Environment Variables

   Production, Preview, Development すべてにチェック
   ```

2. **再デプロイ:**
   ```bash
   # 環境変数変更後は必ず再デプロイ
   vercel --prod
   ```

---

## データベースクエリ関連

### "column does not exist"

**症状:**
```sql
ERROR: column "user_id" does not exist
```

**解決策:**
1. **テーブル構造確認:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'x_connections';
   ```

2. **マイグレーション実行:**
   ```sql
   -- docs/database/schema.md の SQL を実行
   ```

---

## パフォーマンス問題

### APIレスポンスが遅い

**チェックポイント:**
1. **N+1クエリ:**
   ```typescript
   // 悪い例
   for (const stream of streams) {
     const samples = await getSamples(stream.id); // N回クエリ
   }

   // 良い例
   const samples = await supabase
     .from('samples')
     .select('*')
     .in('stream_id', streamIds); // 1回のクエリ
   ```

2. **インデックス追加:**
   ```sql
   CREATE INDEX idx_samples_stream_id ON samples(stream_id);
   CREATE INDEX idx_links_short_code ON links(short_code);
   CREATE INDEX idx_clicks_link_id ON clicks(link_id);
   ```

---

## よくある質問

### Q: ローカルでテストできない機能は？
A: Twitch Webhookは公開URLが必要。ngrokまたはCloudflare Tunnelを使用してください。

### Q: 本番環境とローカルでDB分けるべき？
A: はい。Supabaseで開発用と本番用のプロジェクトを分けることを推奨。

### Q: トークンが漏洩したらどうする？
A:
1. Supabaseで該当レコードを削除
2. X Developer Portalでトークンを無効化
3. ユーザーに再認証してもらう

---

次のステップ: 問題が解決しない場合は[GitHub Issues](https://github.com/your-repo/issues)で報告してください。
