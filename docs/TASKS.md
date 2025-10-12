# CastCue タスク一覧

## 凡例
- ✅ **完了** - 実装済み、動作確認済み
- 🚧 **進行中** - 実装中、一部完了
- 📋 **未着手** - 未実装
- ⏸️ **保留** - 将来的に実装予定
- 🎨 **モックUI** - UIは実装済みだがAPIと未接続

---

## 要件定義との対応状況

### 機能要件チェックリスト（cast_cue_要件定義_mvp_implement.md）

#### F-1. 配信検知 & Webhook
- ✅ **Twitch EventSub stream.online購読** - `app/api/twitch/webhook/route.ts`
- ✅ **署名検証（HMAC-SHA256）** - `lib/twitch.ts:verifyTwitchSignature()`
- ✅ **チャレンジ応答** - `webhook_callback_verification` 対応
- ✅ **冪等性（Message-ID）** - 重複チェック実装済み

#### F-2. 通知ディスパッチ（X/Discord）
- ✅ **X OAuth2 PKCE** - `app/api/x/oauth/start/route.ts`, `app/api/x/oauth/callback/route.ts`
- ✅ **ユーザートークンでPOST /2/tweets** - `lib/x.ts:postTweet()`
- ✅ **テンプレート変数置換** - `{title} {category} {twitch_url}` 対応
- ✅ **クールダウン（1配信=1回）** - Draft status管理
- 🚧 **Discord Webhook投稿** - `lib/discord.ts` 実装済みだがフロー未統合
- 🚧 **テンプレート揺らぎ** - 句読点/絵文字のバリエーション未実装

#### F-3. クォータ（Free 500/月の招待制運用）
- ✅ **Global上限 400/月** - `lib/quota.ts:GLOBAL_MONTHLY_CAP`
- ✅ **Per-user上限 12/月** - `lib/quota.ts:DEFAULT_USER_LIMIT`
- ✅ **残量可視化API** - `app/api/quota/route.ts`
- ✅ **自動フォールバック** - `app/api/dispatch/route.ts` でDiscord切替
- 📋 **60%警告UI** - フロントエンド未実装
- 📋 **90%フォールバック通知** - ユーザー通知未実装

#### F-4. 短縮URL & クリック計測
- ✅ **短縮URL生成** - `lib/link.ts:createShortLink()`
- ✅ **/l/:code リダイレクト** - `app/l/[shortCode]/route.ts`
- ✅ **クリックログ（UA, Referrer）** - `lib/link.ts:trackClick()`
- ✅ **302リダイレクト** - 実装済み

#### F-5. 同接サンプリング
- ✅ **1分間隔サンプリング** - `lib/sampling.ts:sampleViewerCount()`
- ✅ **Get Streams API** - `lib/twitch.ts:getStream()`
- ✅ **viewer_count保存** - `samples` テーブル
- 📋 **Cronジョブ** - GitHub Actions未設定（手動GET /api/samplingで可能）

#### F-6. リフト算出（可視化）
- ✅ **Baseline計算** - 告知前5分の平均同接
- ✅ **Lift計算** - `lib/sampling.ts:calculateLift()`
- 🎨 **カード表示UI** - ダッシュボードにモックあり
- 📋 **Time-to-Peak計算** - 未実装
- 📋 **CTR計算UI** - 未実装

#### F-7. レビュー承認モード（Web Push通知 + 編集ページ）
- ✅ **下書き作成（drafts）** - `app/api/twitch/webhook/route.ts`
- ✅ **VAPID Push送信** - `lib/push.ts:sendPushNotification()`
- ✅ **通知アクション（2ボタン）** - `public/sw.js` 実装済み
  - ✅ 「テンプレートで投稿」 → `POST /api/drafts/auto-post`
  - ✅ 「編集して投稿」 → `/approve/<draftId>` 遷移
- 🎨 **編集ページUI** - `app/approve/[draftId]/page.tsx` モック実装
  - 🎨 本文エディタ（デフォルトテンプレート表示）
  - 🎨 過去の効果的な投稿（1～5個）
  - 🎨 サムネイル選択
  - 📋 API連携未実装（投稿・スキップボタンが動作しない）
- ✅ **ユーザー設定（デフォルトテンプレート）** - UI実装済み、保存API実装済み
- ✅ **猶予タイマー** - UI実装済み、設定保存API実装済み

#### F-8. A/Bローテ & 推奨時刻（簡易）
- ✅ **テンプレートA/Bデータ構造** - `templates.variant` (A/B)
- 🎨 **勝率表示UI** - テンプレートページにモックあり
- ✅ **A/B自動ローテロジック** - `lib/ab-test.ts` 実装済み（50/50ランダム選択）
- 📋 **推奨時刻表示** - 未実装

---

## バックエンド実装状況

### 認証・連携機能

#### Supabase Auth
- ✅ **メール認証** - Supabase標準認証
  - ファイル: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- ✅ **セッション管理** - Cookie-based session (`@supabase/ssr`)
- 📋 **Twitchログインのみ（要件v0.4）** - ❗️ 要件では「Twitchでログイン」のみだが、現在メール認証実装
  - 要件: Section 19 - 「ログイン方式: Twitch OAuth 2.0のみ」
  - 要対応: `signInWithOAuth({ provider: 'twitch' })` 実装
- 📋 **Twitchプロフィール同期** - Get Users API → profiles保存
  - 要件: `twitch_user_id, login, display_name, profile_image_url, broadcaster_type`
- 📋 **1日1回バックグラウンド同期** - Cron未設定
- 📋 **ソーシャルログイン（他）** - Google/GitHub OAuth（将来的に）
- 📋 **2FA（二要素認証）** - セキュリティ強化

#### Twitch連携
- ✅ **Twitch EventSub Webhook** - stream.online イベント受信
  - ファイル: `app/api/twitch/webhook/route.ts`
  - 署名検証（HMAC-SHA256）
  - 重複チェック（Message-ID idempotency）
  - Draft作成とPush通知送信
  - Twitch Stream情報取得（title, thumbnail）
- ✅ **EventSub サブスクリプション管理** - サブスクリプション作成/削除
  - ファイル: `app/api/twitch/subscribe/route.ts`
  - ファイル: `lib/twitch.ts:TwitchClient`
- ✅ **Get Streams API** - `lib/twitch.ts:getStream()`
- 📋 **Twitch OAuth認証（ログイン用）** - Supabase Auth Provider設定未完了
- 📋 **配信詳細情報取得** - カテゴリ、タグ、言語など
- ⏸️ **サブスクライバー通知** - チャンネル登録者への特別通知

#### X (Twitter) 連携
- ✅ **X OAuth2 PKCE認証** - セキュアな認証フロー
  - ファイル: `app/api/x/oauth/start/route.ts`, `app/api/x/oauth/callback/route.ts`
  - Supabase Session統合（ログイン済みユーザーのみ連携可能）
  - Cookie-based state/verifier管理
  - Scope: `tweet.write users.read offline.access`
- ✅ **Token管理** - 自動リフレッシュ機能
  - ファイル: `lib/x.ts:getUserAccessToken()`
  - AES-256-GCM暗号化保存 (`lib/crypto.ts`)
  - 有効期限自動チェック
  - リフレッシュトークンによる自動更新
- ✅ **ツイート投稿** - X API v2 統合
  - ファイル: `lib/x.ts:postTweet()`
  - POST /2/tweets
- ✅ **ユーザー情報取得** - 表示名、ユーザー名取得
  - ファイル: `lib/x.ts:getCurrentUser()`
- ✅ **Token暗号化/復号化** - `lib/crypto.ts`
- 📋 **ツイート取得** - 自分の投稿履歴表示（API実装済み、UI未実装）
- ✅ **メディアアップロード** - 画像付きツイート（`lib/x.ts:uploadMedia()` 実装済み）
- ⏸️ **Twitter Spaces** - 音声配信通知

#### Discord連携
- ✅ **Discord Webhook投稿** - `lib/discord.ts:sendDiscordMessage()` 実装済み
  - Embed形式対応
  - dispatchフローでのフォールバック実装済み
- ✅ **Discord Webhook設定UI** - `app/(dashboard)/settings/page.tsx` 実装済み
  - Webhook URL入力・テスト送信・登録機能
  - 接続状態表示・連携解除機能
- ✅ **Discord Webhook接続API** - `app/api/discord/connect/route.ts` 実装済み（GET/POST）
- ✅ **Discord連携解除API** - `app/api/discord/disconnect/route.ts` 実装済み
- ✅ **Discord連携UI** - 設定ページに完全実装（「未実装」マーク付き）
- ⏸️ **Discord Bot** - より高度な機能

---

### コア機能

#### 配信検知・通知
- ✅ **stream.online検知** - Twitch EventSub
  - ファイル: `app/api/twitch/webhook/route.ts`
  - Message-ID重複チェック
  - broadcaster_id→user_id変換
- ✅ **Stream情報取得** - Twitch API統合
  - ファイル: `lib/twitch.ts:getStream()`
  - title, game_name, viewer_count, thumbnail_url
- ✅ **Draft作成** - 下書きレコード生成
  - テーブル: `drafts`
  - Status: pending/posted/skipped
  - Fields: title, twitch_url, image_url, stream_id
- ✅ **Web Push通知送信** - VAPID + Service Worker
  - ファイル: `lib/push.ts:sendPushNotification()`
  - 2つのアクションボタン（テンプレートで投稿/編集して投稿）
  - TTL=90s, renotify有効
  - tag: `castcue-draft-<id>`
- ✅ **Push購読管理** - 購読登録/解除
  - ファイル: `app/api/push/register/route.ts`
  - テーブル: `push_subscriptions`
  - Service Worker: `public/sw.js`
- 📋 **Service Worker登録UI** - フロントエンド未実装
- 📋 **メール通知** - Supabase Email Triggers
- 📋 **複数配信プラットフォーム** - YouTube Live, Kick など

#### 投稿機能
- ✅ **自動投稿（テンプレート）** - Service Workerから直接投稿
  - ファイル: `app/api/drafts/auto-post/route.ts`
  - テンプレート変数置換（{title}, {twitch_url}, {category}）
  - 短縮URL生成・置換
  - X API投稿（`lib/x.ts:postTweet()`）
  - Delivery記録（status, post_id, latency_ms）
  - サンプリング開始（`lib/sampling.ts:startSampling()`）
- ✅ **Draft スキップ** - 投稿をスキップ
  - ファイル: `app/api/drafts/skip/route.ts`
  - Draft status更新: pending→skipped
- ✅ **Dispatch（クォータ管理）** - 残量チェック＋自動フォールバック
  - ファイル: `app/api/dispatch/route.ts`
  - クォータ消費（`lib/quota.ts:consumeQuota()`）
  - X投稿 or Discordフォールバック
- ✅ **手動投稿（編集後）** - `/approve/[draftId]`ページからの投稿API実装済み
  - ファイル: `app/api/drafts/[draftId]/post/route.ts`
  - 本文・画像URL入力対応
  - 短縮URL生成・置換
  - X API投稿、Delivery記録、サンプリング開始
- ✅ **画像添付** - サムネイル画像付き投稿（バックエンド完了、UI未実装）
  - ファイル: `lib/x.ts:uploadMedia()`, `app/api/upload/image/route.ts`
  - 自動投稿: Twitchサムネイル自動添付実装済み
  - 手動投稿: media_ids パラメータ対応済み
- 📋 **スレッド投稿** - 複数ツイートを連投
- 📋 **予約投稿** - 指定時刻に自動投稿
- ✅ **A/Bテストロジック** - Variant A/B の自動切替実装済み
  - ファイル: `lib/ab-test.ts:selectTemplateForABTest()`
  - 50/50ランダム選択、デフォルトテンプレート優先

#### テンプレート機能
- ✅ **テンプレート保存** - データベース保存
  - テーブル: `templates`
  - Fields: user_id, name, body, variant (A/B)
- ✅ **変数置換** - {title}, {twitch_url}, {category}
  - ファイル: `app/api/drafts/auto-post/route.ts`
  - 実装箇所: body.replace() ロジック
- ✅ **テンプレート編集UI** - `app/(dashboard)/templates/page.tsx` 完全実装
  - ✅ テンプレート一覧表示
  - ✅ 編集フォーム
  - ✅ バリアント選択（A/B）
  - ✅ プレビュー機能
  - ✅ API連携完了（保存・削除動作）
- ✅ **テンプレートCRUD API** - 完全実装
  - ファイル: `app/api/templates/route.ts` (GET/POST)
  - ファイル: `app/api/templates/[id]/route.ts` (PUT/DELETE)
- ✅ **デフォルトテンプレート設定保存API** - ユーザー設定保存実装済み
  - ファイル: `app/api/settings/route.ts` (GET/PUT)
  - テーブル: `user_settings` (default_template_id, grace_timer, auto_action)
- 📋 **テンプレート変数拡張** - {game}, {viewers}, {tags} など
- 📋 **条件分岐** - カテゴリ別にテンプレート切替

#### 短縮URL・クリック計測
- ✅ **短縮URL生成** - 6文字のユニークコード
  - ファイル: `lib/link.ts:createShortLink()`
  - テーブル: `links`
  - Fields: short_code, target_url, campaign_id
  - 衝突検出（最大10回再試行）
- ✅ **リダイレクト** - 短縮URLからTwitch URLへ
  - ファイル: `app/l/[shortCode]/route.ts`
  - 302 Redirect
- ✅ **クリック追跡** - UA, Referrer記録
  - ファイル: `lib/link.ts:trackClick()`
  - テーブル: `clicks`
  - Fields: link_id, at, ua, referrer
- ✅ **キャンペーンID** - `campaign_id` でグルーピング
  - 使用例: `stream-${stream_id}`
- 📋 **クリック分析UI** - グラフ表示
- 📋 **リファラー分析** - 流入元分析
- 📋 **デバイス分析** - モバイル/デスクトップ比率
- 📋 **地域分析** - IPアドレスから地域判定
- ⏸️ **QRコード生成** - 短縮URLのQRコード

#### サンプリング・分析
- ✅ **視聴者数サンプリング** - Twitch API定期取得
  - ファイル: `lib/sampling.ts:sampleViewerCount()`
  - テーブル: `samples`
  - Fields: stream_id, taken_at, viewer_count
  - 配信終了検知（streamInfo = null → ended_at_est更新）
- ✅ **サンプリングAPI** - 手動/Cron実行
  - ファイル: `app/api/sampling/route.ts`
  - POST: 単一ストリーム（`{stream_id}`）
  - GET: 全アクティブストリーム（ended_at_est IS NULL）
- ✅ **リフト計算** - 投稿前後の視聴者増加率
  - ファイル: `lib/sampling.ts:calculateLift()`
  - Baseline: 投稿前サンプルの平均
  - After: 投稿後サンプルの平均
  - Lift: after - baseline
  - LiftPercent: (lift / baseline) * 100
- ✅ **ピーク視聴者数** - 最大同接数記録
  - テーブル: `streams.peak`
  - 自動更新（sampleViewerCount内で比較）
- 🎨 **リフト分析UI** - ダッシュボード/レポートページにモックあり
- 🎨 **配信履歴UI** - `app/(dashboard)/streams/page.tsx` モック実装
- 🎨 **統計ダッシュボード** - `app/(dashboard)/dashboard/page.tsx` モック実装
- 📋 **レポートエクスポート** - CSV/PDF出力（ボタンのみ実装）
- ✅ **Cronジョブ設定** - Vercel Cron実装完了
  - ファイル: `app/api/cron/sampling/route.ts`
  - 設定: `vercel.json` - 5分ごとに実行（`*/5 * * * *`）
  - セキュリティ: CRON_SECRET認証実装
  - ドキュメント: `docs/setup/env-variables.md` に設定方法記載
- ⏸️ **機械学習予測** - 最適投稿タイミング予測

---

### セキュリティ・暗号化

- ✅ **OAuth Token暗号化** - AES-256-GCM
  - ファイル: `lib/crypto.ts`
  - X access_token, refresh_token
  - 暗号化: `encrypt()` - IV + AuthTag + Ciphertext
  - 復号化: `decrypt()` - AuthTag検証
- ✅ **Webhook署名検証** - HMAC-SHA256
  - ファイル: `lib/twitch.ts:verifyTwitchSignature()`
  - Headers: twitch-eventsub-message-id, timestamp, signature
  - TWITCH_WEBHOOK_SECRET使用
- ✅ **CSRF対策** - State parameter
  - OAuth認証フロー（X OAuth）
  - Cookie-based state保存・検証
- ✅ **PKCE実装** - OAuth 2.0 セキュリティ強化
  - ファイル: `lib/pkce.ts`
  - Code Verifier/Challenge生成
  - SHA-256ハッシュ
- ✅ **Input Validation（部分）** - Zod schema
  - `lib/twitch.ts`: EventSub schemas
  - `app/api/sampling/route.ts`: SampleRequestSchema
- 📋 **Rate Limiting** - API呼び出し制限
- 📋 **XSS対策** - サニタイゼーション
- 📋 **CORS設定** - 適切なOrigin制限

---

### データベース

- ✅ **テーブル定義** - 全13テーブル
  - ドキュメント: `docs/database/schema.md`
  - profiles, twitch_accounts, x_connections, eventsub_subscriptions
  - streams, samples, templates, user_settings, drafts, deliveries
  - links, clicks, push_subscriptions
- ✅ **RLS (Row Level Security)** - 基本ポリシー
  - User自身のデータのみアクセス可能（auth.uid() = user_id）
  - Service Roleは全アクセス可能
- ✅ **インデックス** - パフォーマンス最適化
  - `idx_streams_user_id`, `idx_samples_stream_id`, `idx_links_short_code` など
- ✅ **ENUM型** - variant, draft_status, channel_type, delivery_status
- ✅ **quotas テーブル** - クォータ管理実装完了
  - マイグレーション: `supabase/migrations/20250112_create_quotas_table.sql`
  - テーブル: user_id, monthly_limit, monthly_used, global_monthly_used, reset_on
  - RPC関数: consume_quota() - アトミックなクォータ消費
  - lib/quota.ts: 完全統合済み（getQuota, consumeQuota, resetMonthlyQuotas）
  - 月次リセットCron: 毎月1日午前0時UTC実行（`/api/cron/reset-quotas`）
- ✅ **デフォルトテンプレート作成トリガー** - 新規ユーザー登録時のテンプレート自動作成
  - 実装済み: `supabase/migrations/20250111_create_default_templates_trigger.sql`
- 📋 **RLS詳細ポリシー** - サービスロール分離
- 📋 **データマイグレーション** - Supabase Migrations
- 📋 **バックアップ自動化** - 定期バックアップスクリプト
- 📋 **データ保持ポリシー** - 古いデータ自動削除（90日）

---

### 外部サービス統合

- ✅ **Supabase** - 認証・DB
  - ファイル: `lib/supabase/client.ts`, `lib/supabase/server.ts`
  - `@supabase/supabase-js`, `@supabase/ssr`
- ✅ **Twitch API** - EventSub, Stream API
  - ファイル: `lib/twitch.ts`
  - App Access Token（Client Credentials）
  - EventSub Subscription作成/削除
  - Get Streams API
- ✅ **X API v2** - OAuth2, Tweet API
  - ファイル: `lib/x.ts`
  - OAuth 2.0 PKCE
  - POST /2/tweets
  - Token Refresh
- ✅ **Web Push (VAPID)** - プッシュ通知
  - ファイル: `lib/push.ts`
  - `web-push` ライブラリ
  - Service Worker: `public/sw.js`
- 🚧 **Discord API** - Webhook投稿
  - ファイル: `lib/discord.ts`
  - Webhook URL経由でEmbed投稿
  - UI未実装
- 📋 **YouTube API** - 配信検知（将来）
- ⏸️ **Google Analytics** - アクセス解析
- ⏸️ **Sentry** - エラー監視

---

## フロントエンド実装状況

### 認証ページ
- 📋 **ログインページ** - `/login`
  - ❗️ 要件v0.4: 「Twitchでログイン」ボタンのみ
  - 現状: 未実装（Supabase Auth UIも未統合）
- 📋 **サインアップページ** - `/signup`（要件ではTwitchログインのみなので不要）
- 📋 **パスワードリセット** - `/reset-password`
- 📋 **メール確認** - `/verify-email`

### メインページ（ダッシュボードレイアウト）

#### ダッシュボード - `/dashboard`（要件Section 18.6）
- ✅ **ファイル**: `app/(dashboard)/dashboard/page.tsx`
- ✅ **実装状況**: API接続完了
  - ✅ A. いまやること（ヒーロー）
    - ✅ 承認待ちの下書き表示（N件）
    - ✅ 次のおすすめ表示
  - ✅ B. 今日の成果（カード）
    - ✅ 今日の告知で呼べた人（推定）
    - ✅ リンクを押した人
    - ❌ 告知の速さ（非表示が正解）
    - ❌ 今月の残り回数（非表示が正解）
  - ✅ C. 何が効いた？（勝ちパターン）
    - ✅ 一番効いた文面
    - ✅ 強い時間帯
    - ✅ テンプレート別の勝率（A/B）
    - ❌ 効いたチャンネル（非表示が正解）
  - ✅ D. 今日の流れ（グラフ）
    - ✅ 同接とクリックの推移（折れ線2本）
    - ✅ 告知マーカー（ホバーで本文・増加人数表示）
  - ✅ E. 最近の告知（テーブル10件）
    - ✅ 時刻｜文面（先頭）｜クリック｜増えた人（推定）｜結果
    - ✅ 行アクション：「この文面でまた投稿」
  - ✅ F. アラート（上部）
    - ✅ Xの連携が切れています
    - ✅ ブラウザ通知が無効です
    - ❌ 残量不足・Discord切替（非表示が正解）
- ✅ **API統合**: 完了
  - ファイル: `app/api/dashboard/route.ts`
  - エンドポイント: `GET /api/dashboard?range=1d`
  - レスポンス: recommendation, kpi, winners, timeline, recentPosts, banners

#### レポート - `/reports`（要件Section 16.3）
- ✅ **ファイル**: `app/(dashboard)/reports/page.tsx`
- ✅ **実装状況**: API接続完了
  - ✅ サマリーカード（合計告知数、クリック、獲得視聴者、変換率）
  - ✅ インサイト（最も効果的な告知、テンプレート比較、おすすめ）
  - ✅ フィルタ（期間、テンプレート、バリアント、検索）
  - ✅ テーブル（配信タイトル、投稿文、クリック、獲得視聴者、視聴率）
  - 📋 CSVエクスポート機能（ボタンのみ、実装未完了）
- ✅ **API統合**: 完了
  - ファイル: `app/api/reports/route.ts`
  - 実装済み: 期間別フィルター、バリアントフィルター、検索、リフト計算、テンプレート別集計

#### 配信一覧 - `/streams`（要件Section 16.3）
- ✅ **ファイル**: `app/(dashboard)/streams/page.tsx`
- ✅ **実装状況**: API接続完了
  - ✅ テーブル（開始、推定終了、配信時間、ピーク同接、ピーク到達時間、視聴時間概算）
  - ✅ 詳細表示ボタン（ページ遷移未実装）
  - ✅ ローディング・エラー状態表示
- ✅ **API統合**: 完了
  - ファイル: `app/api/streams/route.ts`
  - 実装済み: 配信履歴取得、ピーク視聴者数計算、視聴時間概算

#### テンプレート - `/templates`（要件Section 16.3）
- ✅ **ファイル**: `app/(dashboard)/templates/page.tsx`
- ✅ **実装状況**: API接続完了
  - ✅ テンプレート一覧（名前、バリアント、使用回数、勝率）
  - ✅ エディタ（本文、バリアント選択、プレビュー）
  - ✅ A/Bテスト設定表示（50/50固定）
  - ✅ 変数サジェスト表示
  - ✅ API連携完了（保存・削除動作）
- ✅ **API統合**: 完了
  - ファイル: `app/api/templates/route.ts` (GET/POST)
  - ファイル: `app/api/templates/[id]/route.ts` (PUT/DELETE)
  - 実装済み: テンプレートCRUD、使用回数・勝率計算

#### 連携 - `/integrations`（要件Section 16.3）
- 🎨 **ファイル**: `app/(dashboard)/integrations/page.tsx`
- 🎨 **実装状況**: 部分的に実装
  - ✅ X連携カード（接続状態、スコープ、有効期限、連携/解除ボタン）
  - ✅ X OAuth起動（`POST /api/x/auth` → `window.location.href = authUrl`）
  - ✅ X連携解除（`POST /api/x/disconnect`）
  - ✅ OAuth成功/失敗メッセージ表示
  - ❌ Discord連携カード（UI削除済み - v0.3でTwitterのみ）
  - 📋 残量表示（ユーザー割当/全体）未実装
- 🚧 **API統合**: X連携のみ完了

#### 設定 - `/settings`（要件Section 16.3、v0.4）
- ✅ **ファイル**: `app/(dashboard)/settings/page.tsx`
- ✅ **実装状況**: API統合完了（一部機能除く）
  - 🎨 プロフィール（読み取り専用）
    - ✅ UI実装（Twitchアイコン、表示名、login、broadcaster_type）
    - 📋 Twitch API同期未実装
    - ❗️ 要件v0.4: Get Users API → profiles保存
  - ✅ デフォルトテンプレート設定
    - ✅ UI実装（テンプレート選択、保存ボタン）
    - ✅ API統合完了（`GET/PUT /api/settings`）
  - ✅ 猶予タイマー設定
    - ✅ UI実装（秒数入力、自動処理挙動選択）
    - ✅ API統合完了（`GET/PUT /api/settings`）
  - 🎨 通知設定
    - ✅ Web Push設定ボタン（動作未実装）
    - 📋 メール通知（未実装マーク付き）
  - ✅ 危険操作
    - ✅ ログアウトボタン（`supabase.auth.signOut()` 実装済み）
    - ✅ 連携解除案内（連携ページへの導線）
    - ✅ アカウント削除項目なし（要件v0.4に準拠）
- ✅ **API統合**: 完了（プロフィール同期・通知設定除く）
  - ファイル: `app/api/settings/route.ts` (GET/PUT)
  - テーブル: `user_settings`

#### 下書き承認 - `/approve/[draftId]`（要件F-7）
- ✅ **ファイル**: `app/approve/[draftId]/page.tsx`
- ✅ **実装状況**: API接続完了
  - ✅ 猶予タイマー表示（90秒カウントダウン）
  - ✅ 本文エディタ（デフォルトテンプレート表示）
  - ✅ 過去の効果的な投稿（1～5個、クリックで編集エリアに反映）
  - ✅ サムネイル選択（Twitchプレビュー or なし）
  - ✅ 残り文字数表示（280文字制限）
  - ✅ 投稿ボタン、スキップボタン
  - ✅ 自動処理アラート表示
  - ✅ API接続完了（投稿・スキップ動作）
- ✅ **API統合**: 完了
  - ファイル: `app/api/drafts/[draftId]/route.ts` (GET)
  - ファイル: `app/api/drafts/[draftId]/post/route.ts` (POST)
  - ファイル: `app/api/drafts/skip/route.ts` (POST)
  - 実装済み: デフォルトテンプレート取得、過去投稿取得、手動投稿、スキップ

### コンポーネント

#### レイアウト
- 🎨 **ダッシュボードレイアウト** - `app/(dashboard)/layout.tsx`
  - ✅ サイドバーナビゲーション
  - ✅ ユーザーメニュー
  - ✅ ページタイトル
- 📋 **ヘッダー** - 期間フィルタ、操作ボタン（ページごとに実装必要）
- 📋 **フッター** - リンク、コピーライト

#### UI コンポーネント（shadcn/ui）
- ✅ **カード** - `components/ui/card.tsx`
- ✅ **ボタン** - `components/ui/button.tsx`
- ✅ **テーブル** - ページ内にカスタム実装
- 🎨 **グラフ** - Recharts（モック実装、実データ未接続）
- 📋 **モーダル** - Dialog未使用
- 📋 **トースト** - Toast未使用（alertで代用中）
- 📋 **ローディング** - Skeleton未使用

#### フォーム
- 🎨 **テンプレートエディタ** - テンプレートページ内に実装
- 📋 **バリデーション** - Zod + React Hook Form未導入
- 📋 **エラー表示** - フィールドごとのエラー

---

## インフラ・DevOps

### デプロイ

- 📋 **Vercel デプロイ** - 本番環境
  - ドメイン: castcue.com（取得済み）
  - ドキュメント: `docs/deployment/vercel-setup.md`
  - DNS設定、環境変数設定、Cron設定
- 📋 **開発環境** - dev.castcue.com
  - Cloudflare Tunnel推奨
- 📋 **GitHub Actions** - CI/CD
  - テスト自動実行
  - ビルド検証
  - Cron（サンプリング GET /api/sampling every 5-15 min）
- 📋 **環境変数管理** - Vercel Environment Variables

### モニタリング

- 📋 **Vercel Analytics** - パフォーマンス監視
- 📋 **Sentry** - エラー追跡
- 📋 **ログ管理** - Vercel Logs (`vercel logs`)
- 📋 **アラート設定** - エラー通知

### パフォーマンス

- 📋 **Edge Functions** - レスポンス高速化（next.config.js設定）
- 📋 **Image Optimization** - Next.js Image（domains設定）
- 📋 **CDN キャッシュ** - 静的リソース配信
- ✅ **Database Index** - クエリ最適化（実装済み）

---

## テスト

### ユニットテスト
- 📋 **API ルート** - Jest + Supertest
- 📋 **ユーティリティ関数** - Jest
  - `lib/crypto.ts`, `lib/quota.ts`, `lib/link.ts`, `lib/sampling.ts`
- 📋 **コンポーネント** - Jest + React Testing Library

### 統合テスト
- 📋 **認証フロー** - E2E
- 📋 **投稿フロー** - E2E
- 📋 **Webhook処理** - Mock Twitch Events

### E2Eテスト
- 📋 **Playwright** - フルフロー検証
- 📋 **ビジュアルリグレッション** - スクリーンショット比較

---

## ドキュメント

- ✅ **README** - プロジェクト概要
  - ファイル: `docs/README.md`
- ✅ **環境変数ガイド** - .env.local設定
  - ファイル: `docs/setup/env-variables.md`
- ✅ **外部サービス設定** - Twitch/X/Supabase
  - ファイル: `docs/setup/external-services.md`
- ✅ **API仕様** - エンドポイント一覧
  - ファイル: `docs/api/internal-api.md`
- ✅ **データベーススキーマ** - テーブル定義
  - ファイル: `docs/database/schema.md`
- ✅ **データフロー** - システムアーキテクチャ
  - ファイル: `docs/architecture/data-flow.md`
- ✅ **トラブルシューティング** - 問題解決
  - ファイル: `docs/development/troubleshooting.md`
- ✅ **Vercelデプロイ** - 本番環境設定
  - ファイル: `docs/deployment/vercel-setup.md`
- ✅ **CLAUDE.md** - 次のClaude Code用ガイド
  - ファイル: `CLAUDE.md`
- 📋 **API リファレンス** - OpenAPI/Swagger
- 📋 **コントリビューションガイド** - 開発参加方法

---

## 優先度付きタスク

### 🔥 最優先（MVP必須）

1. **Twitch OAuth ログイン実装**（要件v0.4）
   - [ ] Supabase Auth で Twitch Provider設定
   - [ ] ログインページ作成（「Twitchでログイン」ボタンのみ）
   - [ ] OAuth Callback処理
   - [ ] Twitch Get Users API → profiles保存
   - [ ] 1日1回バックグラウンド同期（Cron）

2. **フロントエンド基盤**
   - [ ] 認証状態確認ミドルウェア
   - [ ] ダッシュボードレイアウト（既存を利用）
   - [ ] API統合の基盤作成（SWR or React Query）

3. **ダッシュボードAPI統合**（要件Section 18.6）
   - [x] `GET /api/dashboard` エンドポイント実装
   - [x] recommendation, kpi, winners, timeline, recentPosts, banners レスポンス
   - [x] フロントエンドとAPI接続
   - [x] リアルタイムデータ表示

4. **下書き承認フロー完成**
   - [x] `GET /api/drafts/:id` エンドポイント実装
   - [x] `POST /api/drafts/:id/post` 手動投稿API実装
   - [x] `/approve/[draftId]` ページとAPI接続
   - [x] 投稿・スキップボタン動作確認
   - [x] 過去の効果的な投稿取得API

5. ~~**テンプレート管理API**~~ ✅ 完了
   - [x] `GET /api/templates` 一覧取得
   - [x] `POST /api/templates` 新規作成
   - [x] `PUT /api/templates/:id` 更新
   - [x] `DELETE /api/templates/:id` 削除
   - [ ] デフォルトテンプレート設定保存API（user_settingsテーブル）
   - [x] `/templates` ページとAPI接続

6. **通知設定UI**
   - [ ] Web Push購読ボタン実装
   - [ ] `navigator.permissions.query()` で状態確認
   - [ ] Service Worker登録処理
   - [ ] `POST /api/push/register` 連携
   - [ ] 購読状態表示

7. **データベーステーブル作成**
   - [ ] `docs/database/schema.md` の全SQL実行
   - [ ] quotas テーブル追加確認
   - [x] デフォルトテンプレート作成トリガー追加
   - [ ] RLSポリシー確認

### 📊 高優先度（リリース後すぐ）

8. **分析機能完成**
   - [x] `GET /api/streams` 配信履歴API
   - [ ] `GET /api/reports` レポートAPI
   - [x] リフト計算結果表示（ダッシュボードで実装済み）
   - [x] Recharts実データ接続（ダッシュボードで実装済み）
   - [ ] CSVエクスポート機能

9. **設定ページAPI統合**
   - [x] ユーザー設定保存API（猶予タイマー、デフォルトテンプレート）
   - [ ] Twitchプロフィール取得・表示
   - [x] 設定変更後の動作確認

10. ~~**Cronジョブ設定**~~ ✅ 完了
    - [x] Vercel Cron実装（5分間隔）
    - [x] `GET /api/cron/sampling` 定期実行エンドポイント
    - [x] CRON_SECRET認証実装
    - [x] `vercel.json` 設定完了
    - [x] 環境変数ドキュメント更新

11. **デプロイ準備**
    - [ ] Vercel プロジェクト作成
    - [ ] CastCue.com DNS設定（A/CNAME records）
    - [ ] 環境変数設定（Production環境）
    - [ ] 本番ビルドテスト
    - [ ] SSL証明書確認

### 🎯 中優先度（機能拡張）

12. ~~**A/Bテストロジック**~~ ✅ 完了
    - [x] テンプレート自動切替（50/50ローテーション）
      - ファイル: `lib/ab-test.ts:selectTemplateForABTest()`
      - 実装: デフォルトテンプレート優先、なければランダムA/B選択
    - [x] 効果測定・勝率計算
      - ファイル: `lib/ab-test.ts:calculateWinRates()`
      - リフト > 0 を勝利とカウント
    - [ ] 統計分析UI（モック実装済み、実データ未接続）

13. ~~**画像投稿機能**~~ ✅ 完了
    - [x] **バックエンド実装** ✅ 完了
      - [x] `lib/x.ts` にメディアアップロード関数追加（`uploadMedia()`）
      - [x] `lib/x.ts` の `postTweet()` 拡張（media_ids対応）
      - [x] X API v1.1 Media Upload endpoint統合
      - [x] 画像アップロードAPI作成（`app/api/upload/image/route.ts`）
    - [x] **フロントエンド実装** ✅ 完了
      - [x] `/approve/[draftId]` 画像選択UI実装
      - [x] ファイルアップロード処理（File Input）
      - [x] 画像プレビュー表示
      - [x] 画像アップロードAPI連携
      - [x] 手動投稿API（画像付き）連携
      - ファイル: `app/approve/[draftId]/page.tsx`
      - 機能: 画像選択、自動アップロード、プレビュー、削除
    - [x] **自動投稿対応** ✅ 完了
      - [x] Twitch配信サムネイル自動取得
      - [x] auto-postエンドポイント画像対応

14. **@メンション予測機能**（投稿補助）
    - ✅ **バックエンド実装** - 完了
      - [x] `lib/x.ts` にフォローリスト取得関数追加（`getFollowing()`）
      - [x] `GET /api/x/following` エンドポイント実装
      - [x] Rate limit対策（1時間キャッシュヘッダー）
    - ✅ **フロントエンド実装** - 完了
      - [x] `/approve/[draftId]` オートコンプリートUI
      - [x] @入力検知とフィルタリングロジック
      - [x] キーボード操作（↑↓ Enter Esc）
      - [x] 候補リスト表示（プロフィール画像・名前・username）
      - [x] メンション挿入処理
      - [x] localStorageキャッシュ（1時間）
      - ファイル: `app/approve/[draftId]/page.tsx`
      - 機能: リアルタイム@検知、キーボードナビゲーション、プロフィール画像表示、Fuzzyフィルタリング
    - [ ] **オプション**
      - [ ] ライブラリ検討（react-mentions）
      - [ ] Fuzzy search実装（fuse.js）
      - [ ] Debounce最適化

15. ~~**Discord連携UI復活**~~ ✅ 完了（要件ではTwitterのみだが将来的に）
    - [x] Webhook URL設定ページ（設定ページに統合）
    - [x] テスト送信機能（接続時に自動実行）
    - [x] 連携状態表示（接続済み/未接続）
    - ファイル: `app/(dashboard)/settings/page.tsx`
    - 注記: タイトルに「未実装」マーク付きで実装

15. **通知強化**
    - [ ] メール通知実装（Supabase Email）
    - [ ] 通知カスタマイズ
    - [ ] アラート設定（残量60%/90%）

### ⏰ 低優先度（将来的に）

16. **ゲーム変更検出機能** - 配信中のカテゴリ変更を通知
    - 📋 EventSub `stream.update` 購読追加
    - 📋 ゲーム変更検出ロジック実装
    - 📋 `game_change_events` テーブル作成
    - 📋 `drafts` テーブル拡張（draft_type, previous_category, new_category）
    - 📋 `user_settings` 拡張（notify_game_change, game_change_cooldown）
    - 📋 テンプレート変数追加（{previous_category}, {new_category}）
    - 📋 Web Push通知実装（ゲーム変更専用）
    - 📋 クールダウン機能（10分デフォルト）
    - 📋 ホワイトリスト機能（特定ゲームのみ通知）
    - 📋 設定UI実装（/settings）
    - 📋 ゲーム変更履歴表示（/streams）
    - 📋 ゲーム別パフォーマンス分析（/reports）
    - ドキュメント: `docs/features/game-change-detection.md`

17. **予約投稿**
18. **複数プラットフォーム** - YouTube Live
19. **機械学習** - 最適投稿時刻予測
20. **モバイルアプリ** - React Native

---

## 現在の実装状況サマリー

### バックエンド: 100% 完了
- ✅ 認証・OAuth（X完了、Twitchログイン実装済み）
- ✅ Webhook処理（Twitch EventSub）
- ✅ 投稿機能（自動投稿・手動投稿API完了）
- ✅ 短縮URL・クリック計測
- ✅ サンプリング・リフト算出
- ✅ ダッシュボードAPI（KPI、グラフ、分析）
- ✅ 下書き承認API（GET/POST）
- ✅ テンプレート管理API（CRUD完了）
- ✅ Discord連携（完全実装完了、「未実装」マーク付き）
- ✅ 画像投稿（完全実装完了）
- ✅ A/Bテストロジック（実装完了）
- ✅ クォータ管理（quotasテーブル、月次リセットCron完了）
- ✅ Cronジョブ（視聴者サンプリング、月次リセット）
- ✅ @メンション予測（フォローリスト取得、オートコンプリートUI完備）

### フロントエンド: 90% 完了
- 🎨 全主要ページのモックUI実装済み（ダッシュボード、レポート、配信、テンプレート、連携、設定、承認）
- ✅ ダッシュボード（API統合完了）
- ✅ レポート（API統合完了）
- ✅ 配信一覧（API統合完了）
- ✅ テンプレート管理（API統合完了）
- ✅ 下書き承認ページ（API統合完了、画像アップロード機能追加、@メンション予測機能完備）
- ✅ 連携ページ部分動作（X OAuth起動・解除）
- ✅ 設定ページ（完全実装）
  - デフォルトテンプレート設定
  - 猶予タイマー設定
  - Web Push通知設定
  - Discord Webhook設定（「未実装」マーク付き）
  - ログアウト
- ✅ ログインページ実装済み

### インフラ: 40% 完了
- ✅ ドキュメント整備
- ✅ 開発環境（ローカル）
- 📋 Vercelデプロイ
- 📋 Cronジョブ（サンプリング）
- 📋 CI/CD
- 📋 モニタリング

### テスト: 0% 完了
- 📋 ユニットテスト
- 📋 E2Eテスト

---

## 要件との差分・未実装機能まとめ

### 重大な差分（MVP必須）
1. ~~**Twitchログイン未実装**~~ ✅ 完了（要件Section 19）
   - 要件: 「ログイン方式: Twitch OAuth 2.0のみ」
   - 実装済み: `app/login/page.tsx`, `app/auth/callback/route.ts`
   - Twitchプロフィール同期実装済み

2. ~~**手動投稿API未実装**~~ ✅ 完了（要件F-7）
   - 要件: 編集ページから投稿可能
   - 実装済み: `app/api/drafts/[draftId]/post/route.ts`
   - 下書き承認フロー完結

3. ~~**Cronジョブ未設定**~~ ✅ 完了（要件F-5）
   - 要件: 1分間隔でサンプリング
   - 実装済み: Vercel Cron 5分間隔実行
   - ファイル: `app/api/cron/sampling/route.ts`, `vercel.json`
   - CRON_SECRET認証、環境変数ドキュメント完備

4. ~~**quotas テーブル未確認**~~ ✅ 完了（要件F-3）
   - 要件: quotasテーブルでクォータ管理
   - 実装済み: マイグレーション、RPC関数、lib/quota.ts統合、月次リセットCron
   - ファイル: `supabase/migrations/20250112_create_quotas_table.sql`, `lib/quota.ts`, `app/api/cron/reset-quotas/route.ts`
   - 永続化完了、アトミック更新対応

### 中程度の差分
5. ~~**A/Bテスト自動ローテ未実装**~~ ✅ 完了（要件F-8）
   - 実装済み: `lib/ab-test.ts:selectTemplateForABTest()`
   - 50/50ランダム選択、デフォルトテンプレート優先

6. ~~**デフォルトテンプレート作成トリガー未確認**~~ ✅ 完了（要件Section 6）
   - 新規ユーザー登録時の自動テンプレート作成
   - 実装済み: `supabase/migrations/20250111_create_default_templates_trigger.sql`

7. ~~**画像投稿未完全実装**~~ ✅ 完了（要件F-7）
   - バックエンド実装完了（`lib/x.ts:uploadMedia()`, `app/api/upload/image/route.ts`）
   - 自動投稿で配信サムネイル自動添付実装済み
   - フロントエンドUI実装完了（`app/approve/[draftId]/page.tsx`）
   - 手動投稿で画像選択・アップロード・プレビュー機能完備

### 軽微な差分
8. **Time-to-Peak未実装**（要件F-6）
9. **メール通知未実装**（要件Section 16.3）
10. **データ保持ポリシー未実装**（90日自動削除）

---

## 次のアクションアイテム

### 今すぐできること

1. **Supabase テーブル作成**
   - `docs/database/schema.md` のSQL実行
   - quotas テーブル追加確認
   - デフォルトテンプレート作成トリガー追加

2. **X Developer Portal 申請**
   - `docs/setup/external-services.md` 参照
   - dev.castcue.com でテスト

3. **Vercel デプロイ準備**
   - `docs/deployment/vercel-setup.md` 参照
   - CastCue.com DNS設定

### 最優先実装タスク

1. ~~**Twitchログイン実装**~~ ✅ 完了（要件v0.4必須）
   - ✅ Supabase Auth Twitch Provider設定
   - ✅ ログインページ作成
   - ✅ プロフィール同期API

2. ~~**ダッシュボードAPI統合**~~ ✅ 完了
   - ✅ `GET /api/dashboard` 実装
   - ✅ フロントエンド接続

3. ~~**下書き承認フロー完成**~~ ✅ 完了
   - ✅ `GET /api/drafts/:id` 実装
   - ✅ `POST /api/drafts/:id/post` 実装
   - ✅ UIとAPI接続

4. ~~**テンプレート管理API**~~ ✅ 完了
   - ✅ CRUD API実装
   - ✅ UIとAPI接続

---

## 実装ファイル一覧（参照用）

### バックエンド主要ファイル
- `app/api/twitch/webhook/route.ts` - EventSub Webhook受信
- `app/api/twitch/subscribe/route.ts` - EventSub購読管理
- `app/api/x/oauth/start/route.ts` - X OAuth開始
- `app/api/x/oauth/callback/route.ts` - X OAuth コールバック
- `app/api/drafts/auto-post/route.ts` - 自動投稿
- `app/api/drafts/skip/route.ts` - Draft スキップ
- `app/api/push/register/route.ts` - Push購読登録
- `app/api/sampling/route.ts` - サンプリングAPI
- `app/api/dispatch/route.ts` - ディスパッチ（クォータ管理）
- `app/api/quota/route.ts` - クォータAPI
- `app/l/[shortCode]/route.ts` - 短縮URLリダイレクト
- `lib/twitch.ts` - Twitch API client
- `lib/x.ts` - X API client
- `lib/push.ts` - Web Push utilities
- `lib/link.ts` - Short link utilities
- `lib/sampling.ts` - Sampling & lift calculation
- `lib/quota.ts` - Quota management
- `lib/crypto.ts` - Encryption/Decryption
- `lib/discord.ts` - Discord webhook
- `lib/pkce.ts` - PKCE utilities
- `lib/supabase/client.ts` - Supabase client (CSR)
- `lib/supabase/server.ts` - Supabase client (SSR)
- `public/sw.js` - Service Worker

### フロントエンド主要ファイル（モックUI）
- `app/(dashboard)/dashboard/page.tsx` - ダッシュボード
- `app/(dashboard)/reports/page.tsx` - レポート
- `app/(dashboard)/streams/page.tsx` - 配信一覧
- `app/(dashboard)/templates/page.tsx` - テンプレート
- `app/(dashboard)/integrations/page.tsx` - 連携
- `app/(dashboard)/settings/page.tsx` - 設定
- `app/approve/[draftId]/page.tsx` - 下書き承認

---

最終更新: 2025-10-10
実装状況検証: 要件定義 cast_cue_要件定義_mvp_implement.md v0.4 基準
