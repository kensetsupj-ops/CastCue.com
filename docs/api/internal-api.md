# 内部API仕様

実装済みの全エンドポイント一覧と使用方法。

## 認証関連

### Supabase Auth
Supabaseの標準認証を使用。詳細は Supabase ドキュメント参照。

## Twitch 関連

### POST /api/twitch/webhook
Twitch EventSub Webhook エンドポイント。

**概要:**
- Twitch から stream.online イベントを受信
- 署名検証 (HMAC-SHA256)
- Draft レコード作成
- Web Push 通知送信

**リクエスト:**
```
POST /api/twitch/webhook
Headers:
  Twitch-Eventsub-Message-Id: <message-id>
  Twitch-Eventsub-Message-Timestamp: <timestamp>
  Twitch-Eventsub-Message-Signature: <signature>
  Twitch-Eventsub-Message-Type: <type>
```

**メッセージタイプ:**

1. **webhook_callback_verification (初回のみ)**
```json
{
  "challenge": "challenge-string",
  "subscription": {...}
}
```
レスポンス: チャレンジ文字列をそのまま返す

2. **notification (配信開始時)**
```json
{
  "subscription": {
    "type": "stream.online"
  },
  "event": {
    "id": "stream-id",
    "broadcaster_user_id": "12345",
    "broadcaster_user_login": "username",
    "started_at": "2025-01-01T00:00:00Z"
  }
}
```

**処理フロー:**
1. 署名検証
2. メッセージIDで重複チェック
3. broadcaster_idからユーザー特定
4. Twitch APIで配信情報取得
5. streamsテーブルにレコード作成
6. draftsテーブルに下書き作成
7. Web Push通知送信

**レスポンス:**
```
204 No Content
```

---

### POST /api/twitch/subscribe
EventSub サブスクリプション作成。

**リクエスト:**
```json
{
  "user_id": "uuid",
  "broadcaster_user_id": "12345"
}
```

**レスポンス:**
```json
{
  "subscription_id": "sub-id",
  "status": "enabled"
}
```

---

## X (Twitter) 関連

### POST /api/x/oauth/start
X OAuth 認証フロー開始。

**概要:**
- PKCEのcode_verifier生成
- stateパラメータ生成
- 認証URLを返す

**リクエスト:**
```
POST /api/x/oauth/start
Authorization: (Supabase session required)
```

**レスポンス:**
```json
{
  "auth_url": "https://twitter.com/i/oauth2/authorize?..."
}
```

**Cookies設定:**
- `oauth_code_verifier`: PKCE verifier
- `oauth_state`: CSRF対策トークン
- `oauth_user_id`: ユーザーID

---

### GET /api/x/oauth/callback
X OAuth コールバック。

**リクエスト:**
```
GET /api/x/oauth/callback?code=xxx&state=xxx
Cookies: oauth_code_verifier, oauth_state, oauth_user_id
```

**処理フロー:**
1. state検証
2. code_verifier取得
3. アクセストークン取得
4. ユーザー情報取得
5. トークン暗号化
6. x_connectionsテーブルに保存

**レスポンス:**
```
302 Redirect to /integrations?success=true
```

---

## Draft 関連

### POST /api/drafts/auto-post
下書きを自動投稿。

**概要:**
- Service Workerから呼び出される
- テンプレート適用
- 短縮URL生成
- X投稿
- サンプリング開始

**リクエスト:**
```json
{
  "draft_id": "uuid"
}
```

**処理フロー:**
1. draft取得（status=pending）
2. デフォルトテンプレート取得
3. テンプレート変数置換
4. 短縮URL生成
5. X OAuth token取得（自動リフレッシュ）
6. ツイート投稿
7. deliveryレコード作成
8. draft status更新（posted）
9. サンプリング開始

**レスポンス:**
```json
{
  "success": true,
  "message": "Auto-post successful",
  "post_id": "1234567890",
  "link_id": "uuid",
  "body": "投稿内容"
}
```

**エラーレスポンス:**
```json
{
  "success": false,
  "error": "Failed to post to X",
  "details": "..."
}
```

---

### POST /api/drafts/skip
下書きをスキップ。

**リクエスト:**
```json
{
  "draft_id": "uuid"
}
```

**レスポンス:**
```json
{
  "success": true
}
```

---

## Push Notification 関連

### POST /api/push/register
Push通知サブスクリプション登録。

**リクエスト:**
```json
{
  "user_id": "uuid",
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "subscription": {
    "id": 123,
    "user_id": "uuid",
    "endpoint": "...",
    "keys": {...}
  }
}
```

---

### DELETE /api/push/register
Push通知サブスクリプション削除。

**リクエスト:**
```
DELETE /api/push/register?endpoint=https://fcm.googleapis.com/...
```

**レスポンス:**
```json
{
  "success": true
}
```

---

## Short Link 関連

### GET /l/:shortCode
短縮URLリダイレクト。

**リクエスト:**
```
GET /l/abc123
```

**処理フロー:**
1. shortCodeでlinkを検索
2. clickレコード作成（UA、Referrer記録）
3. target_urlにリダイレクト

**レスポンス:**
```
302 Redirect to target_url
```

**リンクが存在しない場合:**
```
302 Redirect to /
```

---

## Sampling 関連

### POST /api/sampling
特定のストリームをサンプリング。

**リクエスト:**
```json
{
  "stream_id": 123
}
```

**レスポンス:**
```json
{
  "success": true,
  "sample_id": 456,
  "viewer_count": 1234
}
```

**配信終了時:**
```json
{
  "error": "Failed to sample stream or stream is no longer live"
}
```

---

### GET /api/sampling
全アクティブストリームをサンプリング。

**概要:**
- Cronジョブから定期実行される想定
- ended_at_est が null のストリームをすべてサンプリング

**リクエスト:**
```
GET /api/sampling
```

**レスポンス:**
```json
{
  "success": true,
  "total_streams": 5,
  "sampled": 4
}
```

**Cron設定例:**
```bash
# 5分ごとに実行
*/5 * * * * curl -X GET https://castcue.com/api/sampling
```

---

## Template 関連

### GET /api/templates
ユーザーのテンプレート一覧を取得。

**リクエスト:**
```
GET /api/templates
Authorization: (Supabase session required)
```

**レスポンス:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "デフォルトテンプレートA",
      "variant": "A",
      "usageCount": 15,
      "winRate": 55,
      "body": "【配信開始】{title} をプレイ中！\n{twitch_url}\n\n#Twitch #配信中"
    }
  ]
}
```

---

### POST /api/templates
新規テンプレートを作成。

**リクエスト:**
```json
{
  "name": "新しいテンプレート",
  "body": "配信開始！{title}\n{twitch_url}",
  "variant": "A"
}
```

**レスポンス:**
```json
{
  "success": true,
  "template": {
    "id": "uuid",
    "name": "新しいテンプレート",
    "variant": "A",
    "usageCount": 0,
    "winRate": 0,
    "body": "配信開始！{title}\n{twitch_url}"
  }
}
```

---

### PUT /api/templates/[id]
テンプレートを更新。

**リクエスト:**
```json
{
  "name": "更新されたテンプレート",
  "body": "🎮 配信スタート！{title}\n{twitch_url}",
  "variant": "B"
}
```

**レスポンス:**
```json
{
  "success": true,
  "template": {
    "id": "uuid",
    "name": "更新されたテンプレート",
    "variant": "B",
    "body": "🎮 配信スタート！{title}\n{twitch_url}"
  }
}
```

---

### DELETE /api/templates/[id]
テンプレートを削除。

**リクエスト:**
```
DELETE /api/templates/[id]
Authorization: (Supabase session required)
```

**レスポンス:**
```json
{
  "success": true
}
```

---

## Streams 関連

### GET /api/streams
ユーザーの配信履歴を取得。

**リクエスト:**
```
GET /api/streams
Authorization: (Supabase session required)
```

**レスポンス:**
```json
{
  "streams": [
    {
      "id": 123,
      "streamId": "twitch-stream-id",
      "startedAt": "2025-10-09 14:00",
      "estimatedEnd": "2025-10-09 18:00",
      "duration": "4時間",
      "peakViewers": 87,
      "peakTime": "16:30",
      "estimatedWatchTime": "320時間",
      "platform": "twitch"
    }
  ]
}
```

---

## Reports 関連

### GET /api/reports
詳細なレポートデータを取得。

**Query Parameters:**
- `period`: 期間（today, 7days, 30days）デフォルト: today
- `template`: テンプレートID（オプション）
- `variant`: バリアント（A or B）（オプション）
- `search`: 検索クエリ（オプション）

**リクエスト:**
```
GET /api/reports?period=7days&variant=A
Authorization: (Supabase session required)
```

**レスポンス:**
```json
{
  "summary": {
    "totalReports": 10,
    "totalClicks": 150,
    "totalLift": 85,
    "avgConversion": 0.567
  },
  "bestReport": {
    "id": "uuid",
    "datetime": "2025-10-09 14:30",
    "streamId": 123,
    "streamTitle": "配信タイトル",
    "template": "テンプレートA",
    "variant": "A",
    "clicks": 24,
    "lift": 15,
    "conversion": 0.625,
    "status": "送信済み",
    "body": "投稿内容"
  },
  "templateStats": {
    "A": {
      "count": 5,
      "totalLift": 45,
      "totalClicks": 80
    },
    "B": {
      "count": 5,
      "totalLift": 40,
      "totalClicks": 70
    }
  },
  "reports": [
    {
      "id": "uuid",
      "datetime": "2025-10-09 14:30",
      "streamId": 123,
      "streamTitle": "配信タイトル",
      "template": "テンプレートA",
      "variant": "A",
      "clicks": 24,
      "lift": 15,
      "conversion": 0.625,
      "status": "送信済み",
      "body": "投稿内容"
    }
  ]
}
```

---

## Settings 関連

### GET /api/settings
ユーザー設定を取得。

**リクエスト:**
```
GET /api/settings
Authorization: (Supabase session required)
```

**レスポンス:**
```json
{
  "settings": {
    "default_template_id": "uuid-or-null",
    "grace_timer": 90,
    "auto_action": "skip"
  }
}
```

**設定が存在しない場合:**
デフォルト値を返す（default_template_id: null, grace_timer: 90, auto_action: "skip"）

---

### PUT /api/settings
ユーザー設定を更新。

**リクエスト:**
```json
{
  "default_template_id": "uuid-or-null",
  "grace_timer": 90,
  "auto_action": "skip"
}
```

**フィールド:**
- `default_template_id` (optional): デフォルトテンプレートID（null可）
- `grace_timer` (optional): 猶予タイマー（30〜300秒）
- `auto_action` (optional): タイムアウト時の動作（"post" or "skip"）

**レスポンス:**
```json
{
  "success": true,
  "settings": {
    "default_template_id": "uuid",
    "grace_timer": 90,
    "auto_action": "skip"
  }
}
```

**バリデーションエラー:**
```json
{
  "error": "grace_timer must be between 30 and 300"
}
```

---

## Dashboard 関連

### GET /api/dashboard
ダッシュボード用の集計データを取得。

**Query Parameters:**
- `range`: 期間（1d=今日, 7d=7日間, 30d=30日間）デフォルト: 1d

**リクエスト:**
```
GET /api/dashboard?range=1d
Authorization: (Supabase session required)
```

**レスポンス:**
```json
{
  "recommendation": {
    "time": "19:05",
    "template": "A",
    "reason": "伸びやすい見込み"
  },
  "kpi": {
    "today_lift_sum": 150,
    "today_clicks_sum": 45,
    "per_post_click_avg": 15.0
  },
  "winners": {
    "best_template": {
      "name": "デフォルトテンプレートA",
      "snippet": "配信開始告知",
      "lift": 80,
      "clicks": 25
    },
    "ab_winrate": {
      "A": 55,
      "B": 45
    }
  },
  "timeline": [
    {
      "time": "14:00",
      "viewers": 120,
      "clicks": 5
    }
  ],
  "recentPosts": [
    {
      "time": "14:30",
      "snippet": "配信開始告知",
      "clicks": 15,
      "lift": 50,
      "status": "sent"
    }
  ],
  "banners": {
    "x_link_error": false,
    "push_disabled": true
  }
}
```

---

## その他

### POST /api/quota
ユーザーのクォータ確認・更新（未実装の場合あり）。

---

## エラーレスポンス共通形式

```json
{
  "error": "エラーメッセージ",
  "details": "詳細情報（オプション）"
}
```

**ステータスコード:**
- `400` Bad Request - 不正なリクエスト
- `401` Unauthorized - 認証が必要
- `403` Forbidden - 権限不足
- `404` Not Found - リソースが見つからない
- `500` Internal Server Error - サーバーエラー

---

## 認証要件

### 認証不要なエンドポイント
- `POST /api/twitch/webhook` (署名検証あり)
- `GET /l/:shortCode`

### Supabase Session認証が必要
- `POST /api/x/oauth/start`
- `POST /api/push/register`
- `DELETE /api/push/register`

### リクエストボディで認証
- `POST /api/drafts/auto-post` (draft_id検証)
- `POST /api/drafts/skip` (draft_id検証)
- `POST /api/sampling` (内部APIとして使用)

---

## レート制限

現在レート制限は未実装ですが、以下の実装を推奨:

```typescript
// 推奨実装例
const rateLimit = {
  '/api/drafts/auto-post': '10 req/min per user',
  '/api/sampling': '1 req/5min global',
  '/l/:shortCode': '100 req/min per IP'
}
```

---

次のステップ: [データフロー](../architecture/data-flow.md)を確認してシステム全体の動きを理解する
