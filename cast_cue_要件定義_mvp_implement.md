# CastCue 要件定義 (MVP)
Version: 0.2 / Date: 2025-10-09 / TZ: Asia/Tokyo

> 目的：Twitch配信の**開始検知→自動告知（X/Discord）→“告知→来場”リフト可視化**を、招待制MVPとして短期実装。

---

## 0. ゴール / 非ゴール
- **ゴール**
  - Twitchの`stream.online`で即時検知し、**X（Free枠）**と**Discord**へ即ポスト
  - **1配信=1ポスト**（冪等）+ **Free 500/月**の**公平配分（招待制）**
  - **短縮URL**と**1分サンプルの同接**から**リフト人数**を推定表示
  - **レビュー承認モード（Web Push通知→編集ページ→投稿）**、**簡易A/B（2種ローテ）**
- **非ゴール（Phase 2以降）**：YouTube連携、Bluesky、BYO Keys高度化、詳細チャット分析、スポンサー自動レポート

---

## 1. ペルソナ / ユースケース
- 個人配信者（週2–4回配信）… 告知自動化＋効果の見える化
- 小規模事務所… 権限分離・一括管理（Phase 2）

**主要シナリオ**
1) 初回接続：Twitch→X→Discordを接続、テンプレ選択、テスト投稿
2) 配信開始：自動でポスト、短縮URL発行、ダッシュボードにリフトを表示
3) 残量逼迫：X残量表示、閾値超で自動フォールバック（Discordのみ）

---

## 2. アーキテクチャ（概要）
```
Twitch(EventSub) ──HMAC──> /api/twitch/webhook ──enqueue──> Queue/KV
                                                   │
                                        Worker /api/dispatch
                                                   │
                                      post /2/tweets / Discord
                                                   │
 Short links /l/:code <── tweets      Metrics(clicks/viewers)
                                                   │
                                        Dashboard (Lift/A/B)
```
- フロント：Next.js 15 (App Router, TS, Tailwind)
- サーバ：Next.js Route Handlers（Vercel）
- DB：Supabase(Postgres)。**RLS有効**
- Queue/KV：Supabase（軽量ならテーブルでOK）

---

## 3. 機能要件（F）
### F-1. 配信検知 & Webhook
- Twitch **EventSub** `stream.online`購読（ユーザーごと）
- **署名検証（HMAC-SHA256）** / **チャレンジ応答** / **冪等（Message-ID/stream_id）**

### F-2. 通知ディスパッチ（X/Discord）
- X：OAuth2(PKCE)の**ユーザートークン**で`POST /2/tweets`
- Discord：Webhook URL にJSONポスト
- **テンプレ**：`{title} {category} {twitch_url}`＋**揺らぎ**（句読点/絵文字）
- **クールダウン**：1配信=1回、再送は失敗時のみ

### F-3. クォータ（Free 500/月の招待制運用）
- **Global**：安全上限=**400/月**
- **Per-user**：デフォルト**12/月**（週3相当）
- **残量の可視化**：ユーザー残量・グローバル残量。60%警告/90%自動フォールバック

### F-4. 短縮URL & クリック計測
- `/l/:code`に誘導→**302**でTwitchチャンネルへ。**クリックログ**保存

### F-5. 同接サンプリング
- ライブ期間中、**1分間隔**で`Get Streams` → `viewer_count`を保存

### F-6. リフト算出（可視化）
- **Baseline**：告知前5分の平均同接
- **Lift**：告知10分後の同接 − Baseline − 傾き補正（簡易）
- **カード表示**：`Lift +15 | CTR 3.2% | 変換 0.28 | Time-to-Peak 13m`

### F-7. レビュー承認モード（Web Push通知 + 編集ページ）
- **下書き作成**：`stream.online`受信時に `drafts` レコードを作成（`title, twitch_url, image_url(任意)`）。
- **Push送信**：VAPIDでWeb Pushを送信（TTL=90s、`tag=castcue-draft-<id>`、`renotify`有効）。
  - **通知アクション（2つのボタン）**：
    - **「テンプレートで投稿」**：ユーザーが事前に設定したテンプレートで即座に自動投稿
    - **「編集して投稿」**：Service Worker で `clients.openWindow('/approve/<draftId>')` または既存タブを `focus/navigate`
- **編集ページ**（`/approve/<draftId>`）：
  - **本文エディタ**：デフォルトでユーザーが設定したテンプレートが表示（`{title}` 等の変数は現在の配信情報に自動置き換え）
  - **過去の効果的な投稿（1～5個）**：獲得視聴者数またはクリック→視聴率が高い順に表示
    - 各投稿に **「この投稿を編集する」** ボタン → クリックで編集エリアにその投稿文が表示される（変数は現在の配信情報に置き換え）
  - **サムネイル選択**：Twitchプレビュー画像 or なし
  - **操作**：`投稿` / `スキップ`
- **ユーザー設定**：
  - **デフォルトテンプレート**：ユーザーは事前に投稿で使用するテンプレートを設定（A/Bのどちらか、または特定のテンプレートIDを指定）
  - **猶予タイマー**：例90秒。未操作時の挙動（「自動投稿」or「スキップ」）を選択可能
- **Intentモード**（代替）：`https://twitter.com/intent/tweet?text=...` で手動投稿（画像不可）。

### F-8. A/Bローテ & 推奨時刻（簡易）
- テンプレA/Bを交互適用→**勝率**を表示。**固定の簡易推奨**（直近勝ちやすい時刻）

---

## 4. 非機能要件（NFR）
- **TTNO**（検知→告知完了）：**p95 ≤ 5s**
- **告知成功率**：**≥ 99%**（X残量尽き時はフォールバック扱い）
- **SLO**：Webhook応答≤2s、ワーカー再送上限3回（指数バックオフ）
- **可用性**：Vercel/サーバレス前提、ゾーン障害時は再送により吸収
- **セキュリティ**：TLS、HMAC検証、OAuth(PKCE+state)、RBAC、RLS、監査ログ、トークン暗号化（KMS）

---

## 5. API定義（Route Handlers）
> 返却はJSON（2xx/4xx/5xx）。**型はZodで検証**。

### POST `/api/twitch/webhook`
- Verify: `twitch-eventsub-message-id|timestamp|signature`
- Flows: `webhook_callback_verification`→challenge返却 / `notification`→enqueue / `revocation`→記録
- 返却：`204 No Content`

### POST `/api/dispatch`
- 入力：`{ stream_id, user_id }`
- 処理：テンプレ適用→X/Discordへ送信、`deliveries`更新
- 返却：`{status:"sent", tweet_id?, fallback?:"discord"}`

### GET `/l/:code`
- 処理：`links`で解決→`clicks`に記録→302リダイレクト

### POST `/api/push/register`
- 購読情報を保存（`endpoint, keys`）。認証済ユーザーに紐付け。

### POST `/api/drafts/skip`
- 通知からのスキップ操作を記録。入力：`{ draft_id }`（または通知URL）。

### GET `/approve/[draftId]`
- 下書き編集ページ（認証必須）。本文編集・画像選択→投稿/キャンセル。

### GET `/api/quota`
- 返却：`{ user_remaining, global_remaining, reset_at }`

### POST `/api/x/oauth/start` / GET `/api/x/oauth/callback`
- X OAuth2 (PKCE)。スコープ：`tweet.write users.read offline.access`

### POST `/api/twitch/subscribe`
- 入力：`{ broadcaster_user_id, callback }`
- 処理：EventSub購読作成

---

## 6. データモデル（Postgres / Supabase）
> RLS有効。`auth.users`を前提に`user_id uuid`でひも付け。

```sql
-- 6.1 enums
create type channel_type as enum ('x','discord');
create type delivery_status as enum ('queued','sent','failed','skipped');

-- 6.2 core tables
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

create table twitch_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broadcaster_id text not null unique,
  login text not null,
  display_name text not null,
  verified_at timestamptz
);

create table x_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text[] not null,
  access_token_cipher text not null, -- KMSで暗号化後に保存
  refresh_token_cipher text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table eventsub_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  twitch_subscription_id text not null unique,
  type text not null,
  status text not null,
  revocation_reason text,
  created_at timestamptz default now()
);

create table streams (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'twitch',
  stream_id text not null,
  started_at timestamptz not null,
  ended_at_est timestamptz,
  peak int,
  created_at timestamptz default now(),
  unique(user_id, stream_id)
);

create table samples (
  id bigserial primary key,
  stream_id bigint not null references streams(id) on delete cascade,
  taken_at timestamptz not null,
  viewer_count int not null
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  body text not null,
  variant text check (variant in ('A','B')) default 'A',
  created_at timestamptz default now()
);

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stream_id bigint references streams(id) on delete set null,
  channel channel_type not null,
  status delivery_status not null,
  idempotency_key text not null unique,
  post_id text,
  error text,
  latency_ms int,
  created_at timestamptz default now()
);

create table links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  short_code text not null unique,
  target_url text not null,
  campaign_id uuid,
  created_at timestamptz default now()
);

create table clicks (
  id bigserial primary key,
  link_id uuid not null references links(id) on delete cascade,
  at timestamptz not null default now(),
  ua text,
  referrer text
);

create table quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_limit int not null default 12,
  monthly_used int not null default 0,
  global_monthly_used int not null default 0,
  reset_on date not null
);

-- 6.3 RLS (例)
alter table twitch_accounts enable row level security;
create policy p_twitch_owner on twitch_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 他テーブルも同様にownerポリシー
```

**ビュー/関数（例）**
```sql
create view v_lift as
select d.id as delivery_id,
       s.id as stream_id,
       -- Baseline: 告知前5分の平均
       (select avg(viewer_count)::int from samples
         where stream_id=s.id and taken_at between d.created_at - interval '5 min' and d.created_at) as baseline,
       -- +10分の同接
       (select viewer_count from samples
         where stream_id=s.id and taken_at >= d.created_at + interval '10 min'
         order by taken_at asc limit 1) as after10
from deliveries d
left join streams s on s.id = d.stream_id;
```

**追加（v0.2 / Push & Draft）**
```sql
create table push_subscriptions(
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz default now()
);

create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stream_id bigint references streams(id) on delete set null,
  title text not null,
  twitch_url text not null,
  image_url text,
  status text not null default 'pending', -- pending/posted/skipped
  created_at timestamptz default now()
);
```

---

## 7. 変数・設定（.env）
```
NODE_ENV=development
APP_ORIGIN=https://castcue.example
NEXT_PUBLIC_SITE_URL=https://castcue.example

# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Twitch
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
TWITCH_WEBHOOK_SECRET=long-random-string

# X (Twitter)
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=https://castcue.example/api/x/oauth/callback

# Web Push (VAPID)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}

# Crypto/KMS（アプリ側で暗号化してからDB保管）
DATA_ENCRYPTION_KEY=base64:...
```

---

## 8. ディレクトリ構成（Next.js）
```
app/
  (dashboard)/page.tsx
  api/
    twitch/
      webhook/route.ts
      subscribe/route.ts
    dispatch/route.ts
    push/register/route.ts
    drafts/skip/route.ts
    x/
      oauth/
        start/route.ts
        callback/route.ts
  approve/[draftId]/page.tsx
  l/[code]/route.ts   # 短縮リンク
lib/
  twitch.ts  # HMAC検証, EventSub API
  x.ts       # OAuth, tweetポスト
  quota.ts   # 残量計算
  db.ts      # Supabase client (service role for server)
components/
  cards/
  charts/
scripts/
  subscribe.ts  # EventSub購読作成
```
**追加（v0.2）**: `public/sw.js`, `public/manifest.json`

---

## 9. 擬似コード（重要部）
**/api/twitch/webhook**
```ts
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyHmac(req.headers, raw)) return new Response('forbidden', { status: 403 });
  const type = req.headers.get('twitch-eventsub-message-type');
  const body = JSON.parse(raw);
  if (type === 'webhook_callback_verification') return new Response(body.challenge, { status: 200 });
  if (type === 'notification' && body.subscription?.type === 'stream.online') {
    const { id: msgId } = body; // or header id
    if (await seen(msgId)) return new Response(null, { status: 204 });
    await enqueue({ user_id: mapBroadcaster(body), stream_id: body.event.id });
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 204 });
}
```

**ディスパッチ（残量判定→送信→記録）**
```ts
const ok = await quota.consume(user_id, 1, { globalCap: 400 });
const url = await links.ensure(user_id, streamUrl);
const text = renderTemplate(body, { title, category, twitch_url: url });
const res = await x.tweet(userToken, text);
await deliveries.insert({ status: res.ok ? 'sent' : 'failed', channel: 'x', idempotency_key });
if (!res.ok) await discord.fallback(...);
```

---

## 10. セキュリティ / プライバシー
- **パスワードは保持しない**（アプリはOAuth接続のみ）
- **最小権限**：Xは`tweet.write users.read offline.access`のみ。Twitchは必要最小
- **暗号化保管**：アクセストークンは**アプリで暗号化**→DB保存。復号は限られたサーバ関数のみ
- **RLS + RBAC**：`auth.uid() = user_id` のみアクセス可能。管理操作はサービスロール
- **監査ログ**：`deliveries`/`eventsub_subscriptions`/`quota`の変更をすべて記録
- **連携解除**：UIで1クリック→トークン破棄→EventSub解除
- **保持期間**：クリック/サンプルは90日ローテ

---

## 11. 運用（Free前提）
- **安全上限 400/月**、**ユーザー上限 12/月**（デフォルト）
- **残量60%/90%**でUI警告/自動フォールバック（Discordのみ）
- 週次レポート：`tweet_posted / cap_blocked / fallback_used / avg_lift`

---

## 12. 開発手順（CLI）
```bash
# 1) プロジェクト
pnpm create next-app castcue --ts --eslint --app --tailwind
cd castcue
pnpm add @supabase/supabase-js zod jose undici web-push

# 2) Supabase 初期化 & DDL
pnpm dlx supabase init
pnpm dlx supabase start  # ローカル
# 上記SQLを supabase/migrations に保存して push
pnpm dlx supabase db push

# 3) .env 設定（上記サンプルを .env.local に）

# 3.1) VAPID鍵の作成
npx web-push generate-vapid-keys  # 生成された公開鍵を NEXT_PUBLIC_VAPID_PUBLIC_KEY にも設定

# 4) ルート実装の雛形作成（/api/...）
# 5) Vercel へデプロイ + Cron（集計/ハイライト）
```

---

## 13. 受入基準（Acceptance Criteria）
- [ ] 配信開始→**5秒以内**にXまたはDiscordへ告知が届く
- [ ] **同一配信で重複ポストが発生しない**（冪等）
- [ ] ダッシュボードに**Lift/CTR**が表示される（直近3配信）
- [ ] **残量メーター**が機能し、90%超はXを停止してDiscordへフォールバック
- [ ] クリックログと1分サンプルが**90日で自動ローテ**
- [ ] **通知クリックで `/approve/[draftId]` が自動で開く/既存タブがフォーカスされる**
- [ ] **猶予タイマー**未操作時の挙動（自動投稿 or スキップ）が設定通りになる

---

## 14. ネーミング / コピー / ドメイン
- サービス名：**CastCue**
- 英コピー：**“Your live, on cue.”** / **“Cue the cast.”**
- 候補ドメイン：`castcue.app` / `castcue.io` / `getcastcue.com`（空きは別途確認）

---

## 15. Phase 2（展望メモ）
- **YouTube**：PubSub + `liveBroadcasts.list` のハイブリッドで開始検知
- **Bluesky**：同報、OG統一
- **事務所機能**：承認フロー、監査ログ強化
- **スポンサー**：キャンペーン指定・露出レポート
```



---

## 16. Frontend UI 要件（各ページ）
**デザイン制約**：ダークUI基調。**グラデーション禁止／絵文字禁止**。AI風の派手演出は避け、フラットで実務的。余白多め・視線誘導はコントラストと階層で行う。

### 16.1 デザインシステム
- **色**：
  - 背景：`#0B1220`（base）、`#0F172A`（surface）
  - 面：`#111827`（Card）
  - ボーダー：`#1F2937`
  - テキスト：`#E5E7EB`（強）、`#9CA3AF`（弱）
  - アクセント：`#6366F1`（Primary）/ `#22D3EE`（Info）/ `#10B981`（Success）/ `#F59E0B`（Warning）/ `#EF4444`（Error）
- **タイポ**：Inter（英）/ Noto Sans JP（和）。見出し`700`、本文`400`。
- **コンポーネント**：shadcn/ui（Card, Button, Tabs, Table, Dialog, DropdownMenu, Toast）。
- **チャート**：Recharts。**単色（アクセント1色 + 補助1色）**、ドロップシャドウなし、グリッドは`1px`微弱。
- **アイコン**：lucide-react。**輪郭線のみ**、2px。
- **モーション**：Framer Motionは**最小限（Fade/Slide 120–160ms）**。
- **レスポンシブ**：`sm 640 / md 768 / lg 1024 / xl 1280`。表は`md`未満で主要列のみ表示。

### 16.2 グローバルレイアウト
- 左サイドバー固定（幅`280px`）：検索、ナビ、アカウント、CTA（Get template 相当は「Create template」）。
- ヘッダー：ページタイトル、期間フィルタ、操作（Export CSV, Create…）。
- メイン：カード群 → グラフ → テーブルの順。
- ステート：Loading Skeleton / Empty / Error を全ページに実装。

### 16.3 ページ別要件

#### /dashboard（ダッシュボード）
**目的**：今日と直近30日を俯瞰。MVPの最重要ページ。
- **KPIカード（4〜6枚）**：
  - *TTNO p95*（検知→告知完了秒）
  - *Avg Lift/告知*（中央値）
  - *CTR 中央値*
  - *成功率*（告知成功%）
  - *残量*（X使用 / 400 月上限）
- **メインチャート（ライン2本）**：`viewer_count` と `clicks` の時系列（当日〜24h）。
- **サブチャート（バーチャート）**：過去30日の *Lift 合計*。
- **最近の告知（テーブル3〜5行）**：`日時 / チャンネル / Variant / クリック / Lift / 状態`。行クリックで詳細へ。
- **空状態**：テンプレ作成と連携設定を案内するCTA。

**データ契約**（例）
```ts
GET /api/dashboard?range=30d -> {
  kpi: { ttno_p95: number, avg_lift: number, ctr_median: number, success_rate: number, quota_used: number },
  timeline: { t: string, viewers: number, clicks: number }[],
  liftByDay: { day: string, lift: number }[],
  recent: { id: string, at: string, channel: 'x'|'discord', variant: 'A'|'B', clicks: number, lift: number, status: 'sent'|'failed' }[]
}
```

#### /reports（レポート）
**目的**：告知単位の分析・エクスポート。
- フィルタ：期間（プリセット＋カスタム）、チャンネル、テンプレ、Variant。
- テーブル：`投稿ID / 日時 / チャンネル / テンプレ / Variant / クリック / CTR / Lift / 変換率 / 失敗理由`。
- 行展開：ミニ折れ線（告知±15分の同接）＋Raw Log。
- アクション：`Export CSV`、選択行の`Re-run（Discordのみ）`。

**API**
```ts
GET /api/reports?from&to&channel&template&variant -> { rows: ReportRow[], total: number }
```

#### /streams（配信一覧）
**目的**：配信単位の統計。
- テーブル：`開始 / 推定終了 / 時間 / Peak / Time-to-Peak / 面積(概算視聴時間)`。
- 行クリックで配信詳細（samplesの折れ線、告知とのタイムライン重ね合わせ）。

#### /links（スマートリンク/短縮URL）
- 一覧：`short_code / target / クリック / 直近24h`。
- 追加：モーダル（target URL, campaign 選択）。
- 詳細：クリック時系列、リファラ上位、関連する告知一覧。

#### /templates（テンプレート）
- 一覧：テンプレ名、Variant、使用回数、過去30日の勝率。
- エディタ：`body`（変数 `{title} {category} {twitch_url}` サジェスト）、揺らぎON/OFF、プレビュー。
- A/B：Variant A/B の比率固定（50/50）※MVP。
- バリデーション：文字数上限 280（X）。URL自動短縮を前提に残文字表示。

#### /integrations（連携）
- **X**：接続状態（権限表示：`tweet.write users.read offline.access`）、`Connect`/`Disconnect`、残量（ユーザー割当/全体）。
- **Discord**：Webhook URL 登録・テスト送信。
- 失効時のエラー表示と再接続導線。

#### /tasks（自動化・ジョブ）
- ハイライト翌日告知（ON/OFF・時刻）。
- 失敗時のフォールバック設定（X→Discord）。
- 実行履歴（成功/失敗）。

#### /users（ユーザー/チーム）
- **MVP**は個人のみ：表示専用。Phase 2でロール追加（Viewer/Manager）。

#### /pricing（プラン）
- **招待制表示**：“Invite-only Beta”。将来のStarter/Proカードは**ダミー**で非活性。

#### /settings（設定）
- プロフィール：表示名、タイムゾーン、言語（`ja-JP`/`en-US`）。
- 通知：メール/Discord DMのON/OFF。
- データ：クリック/サンプル保持期間（既定90日）表示、エクスポート。
- 危険操作：連携解除、データ削除。

### 16.4 共通コンポーネント仕様
- **KPI Card**：左上ラベル、右上増減（%/Δ）。本文は数値（`Intl.NumberFormat`）。
- **Table**：ソート、ページネーション、`md`未満は主列のみ。行の状態バッジ（sent/failed）。
- **Filters**：Tabs + DateRangePicker（プリセット：7d/30d/90d）。
- **Toasts**：右上、自動消滅3.2s、1行テキスト。

### 16.5 アクセシビリティ/品質
- コントラスト比 WCAG AA 準拠（カード背景:テキスト ≥ 4.5）。
- キーボード操作（Tab/Shift+Tab, Enter, Esc）網羅。Dialog はフォーカストラップ。
- i18n：英日対応（`next-intl`推奨）。コピーはキー化。
- パフォーマンス：初回 LCP ≤ 2.5s（`lg`想定）、チャートは`lazy import`。

### 16.6 ページ間ナビ（サイドバー）
- **検索**（プレースホルダ："Search…"）
- **Dashboard**
- **Reports**
- **Streams**
- **Links**
- **Templates**
- **Integrations**
- **Tasks**
- **Users**（MVPは閲覧のみ）
- **Pricing**（招待制表示）
- **Settings**

### 16.7 受入基準（UI補足）
- どのページも**グラデーション無し／絵文字無し**で実装されていること。
- ダーク背景において、**境界線とカードの階層**が視覚的に判別できること（ボーダー`#1F2937`程度）。
- テーブルの空状態・エラー状態・ロード中の3種が確認できること。
- KPIカードとチャートは**リサイズに追従**し、`md`未満で単列になること。



---

## 17. 日本語UI表記の確定（v0.2.1）
> 本セクションに記載の**日本語ラベル**を正式とし、UIはこの表記に従います（既存記述に英語が残っていても、本セクションが優先）。

### 17.1 共通文言
- **ボタン**：保存／削除／キャンセル／投稿／スキップ／テスト送信／接続／解除／CSVエクスポート
- **バッジ**：送信済み／失敗／保留／フォールバック
- **プレースホルダー**：検索…／URLを入力
- **トースト**：
  - 送信成功：`告知を送信しました`
  - フォールバック：`Xの残量不足のためDiscordに送信しました`
  - 失敗：`送信に失敗しました。再試行してください`

### 17.2 ナビゲーション（サイドバー）
- ダッシュボード / レポート / 配信一覧 / リンク / テンプレート / 連携 / タスク / ユーザー / 料金 / 設定
- 検索（プレースホルダー：`検索…`）

### 17.3 ダッシュボード
- **KPIカード**：
  - 検知→告知完了 p95（秒）
  - 平均リフト/告知（中央値）
  - CTR（中央値）
  - 告知成功率
  - X残量（今月 / 400 上限）
- **グラフ凡例**：同接／クリック数
- **テーブル列（最近の告知）**：日時／チャンネル／バリアント／クリック／リフト／状態

### 17.4 レポート
- **フィルタ**：期間／チャンネル／テンプレート／バリアント
- **列**：投稿ID／日時／チャンネル／テンプレート／バリアント／クリック／CTR／リフト／変換率／失敗理由
- **アクション**：CSVエクスポート／再送（Discordのみ）

### 17.5 配信一覧
- **列**：開始／推定終了／配信時間／ピーク同接／ピーク到達時間／面積（概算視聴時間）

### 17.6 リンク
- **列**：短縮コード／変換先URL／クリック数／直近24h
- **モーダル**：キャンペーン／作成／閉じる

### 17.7 テンプレート
- **列**：テンプレート名／バリアント／使用回数／勝率（過去30日）
- **エディタ**：揺らぎを有効にする（ON/OFF）

### 17.8 連携
- **X**：接続／解除／再接続／権限
- **Discord**：Webhook URL／テスト送信

### 17.9 タスク
- ハイライト翌日告知：有効／無効／時刻
- フォールバック：有効／無効

### 17.10 設定
- **プロフィール**：表示名／タイムゾーン／言語（日本語／英語）
- **通知**：メール通知／Discord通知
- **データ**：保持期間（日）／エクスポート
- **危険操作**：連携解除／データ削除

### 17.11 編集ページ（/approve/[draftId]）
- **フォーム項目**：
  - 本文（テンプレ＋タイトル＋URLの初期値を表示）
  - サムネイル（Twitchプレビュー／なし）
  - 残り猶予（カウントダウン表示）
- **操作**：投稿／スキップ／キャンセル
- **バリデーション**：280文字上限（URL短縮を考慮して残文字数を表示）



---

## 18. ダッシュボード再定義（v0.3 / Twitterのみ・シンプル版）
> 方針：**ユーザーが見てすぐ嬉しいことだけ**を表示。専門語は出さない。Discord/自動切替/残量関連は**非表示**。

### 18.1 構成
1) **いまやること（ヒーロー）**  
   - **承認待ちの下書き**：`N 件` を表示。CTA：**「編集して投稿」**（/approve/[draftId] へ）。
   - **次のおすすめ**：`19:05 に テンプレB で告知すると伸びやすい見込み`（1行）。

2) **今日の成果（カード）** ※**2枚のみ**
   - **今日の告知で呼べた人（推定）**：例 `+15 人`  
     補足テキスト：`告知前5分と10分後の同接を比較して推定`
   - **リンクを押した人**：例 `54 人（1回の告知あたり 3.2 人）`

3) **何が効いた？（勝ちパターン）**
   - **一番効いた文面**：テンプレ名＋本文先頭30文字、`+18 人 / クリック 61` を併記。
   - **強い時間帯**：`19:00–20:00 が最近強い（平均 +12 人）` の一文＋小さな棒グラフ。
   - **テンプレ別の勝率（A/B）**：`B 62%` の数値と簡易バー。※詳細はレポートへ。

4) **今日の流れ（1枚グラフ）**
   - **同接とクリックの推移（今日）**：折れ線2本。**告知マーカー**にホバーで「本文先頭／増えた人（推定）」。

5) **最近の告知（テーブル10件）**
   - 列：**時刻｜文面（先頭）｜クリック｜増えた人（推定）｜結果（送信済み/失敗）**
   - 行アクション：**「この文面でまた投稿」**（編集画面をプリセット起動）。

6) **アラート（上部バナー）**
   - **Xの連携が切れています**：再接続の導線。  
   - **ブラウザ通知が無効です**：有効化の導線。  
   ※**残量不足/Discordへの自動切替のバナーは出さない**。

### 18.2 指標定義（表示に使う計算の日本語）
- **呼べた人（推定）** = `告知10分後の同接 − 告知前5分平均 − 自然増減の補正` の合計（同日）。
- **リンクを押した人** = 短縮URLのクリック合計（同日）。
- **A/Bの勝率** = 同一期間で各バリアントの「呼べた人（推定）」中央値が高い方の割合。
- 表示ラベルに**「推定」**を明記。数式はツールチップへ格納。

### 18.3 データ契約（/api/dashboard の最小レスポンス）
```ts
GET /api/dashboard?range=1d&channel=x
{
  hero: {
    pending_drafts: number,                     // 承認待ち数
    recommendation: { time: string, template: 'A'|'B', reason: string } | null
  },
  kpi: {
    today_lift_sum: number,                     // 今日の「呼べた人（推定）」合計
    today_clicks_sum: number,                   // 今日のクリック合計
    per_post_click_avg: number                  // 今日の「告知あたりのクリック」平均
  },
  winners: {
    best_template: { name: string, snippet: string, lift: number, clicks: number } | null,
    strong_hours: { hour: string, lift_avg: number }[] | null,
    ab_winrate: { A: number, B: number } | null
  },
  timeline: { t: string, viewers: number, clicks: number, posts?: { id: string, lift: number }[] }[],
  recent: { id: string, at: string, snippet: string, clicks: number, lift: number, status: 'sent'|'failed' }[],
  banners: { x_link_error: boolean, push_disabled: boolean }
}
```

### 18.4 文言（固定ラベル）
- ヒーロー：`承認待ちの下書き`／`編集して投稿`／`次のおすすめ`
- カード：`今日の告知で呼べた人（推定）`／`リンクを押した人`
- 勝ちパターン：`一番効いた文面`／`強い時間帯`／`テンプレ別の勝率`
- グラフ：`同接とクリックの推移（今日）`
- テーブル：`時刻` `文面（先頭）` `クリック` `増えた人（推定）` `結果`
- バナー：`Xの連携が切れています`／`ブラウザ通知が無効です`

### 18.5 受入基準（この変更が反映されたことの判定）
- [ ] ダッシュボードのカードが**2枚のみ**（呼べた人・リンクを押した人）である。
- [ ] **告知の速さ／自動投稿の状態／今月の残り回数**が**どこにも表示されない**。
- [ ] **効いたチャンネル**の表示が**存在しない**（Twitter以外の表現無し）。
- [ ] アラートに**残量不足・Discordへの自動切替**が**表示されない**。
- [ ] ヒーロー領域に**承認待ち**と**次のおすすめ**が表示され、クリックで編集画面・レポートに遷移できる。
```



---

## 18.6 ダッシュボード最終版（Aを含む／Bは①②のみ）
> この小節の内容を最終仕様として実装してください（Twitterのみ。Discord/残量/自動切替の表示は一切なし）。

### A. いまやること（ヒーロー）
- **承認待ちの下書き**：`N件` を表示。
  - CTA：**「編集して投稿」**（/approve/[draftId] へ遷移）
- **次のおすすめ**：例 `19:05 に テンプレB で告知すると伸びやすい見込み`（1行表示）

### B. 今日の成果（カード）
1) **今日の告知で呼べた人（推定）**  
   補足：`告知前5分と10分後の同接を比較して推定`
2) **リンクを押した人**  
   補足：`短縮URLの実数（1回の告知あたり X人）`
> **表示しない**：告知の速さ／自動投稿の状態／今月の自動投稿の残り回数

### C. 何が効いた？（勝ちパターン）
- **一番効いた文面**：テンプレ名＋本文先頭30文字／`+◯人・クリック◯`
- **強い時間帯**：`19:00–20:00 が最近強い（平均 +◯人）`
- **テンプレ別の勝率（A/B）**：例 `B 62%`
> **表示しない**：効いたチャンネル（Twitter以外への言及）

### D. 今日の流れ（グラフ）
- **同接とクリックの推移（今日）**：折れ線2本＋**告知マーカー**（ホバーで本文先頭と推定増加を表示）

### E. 最近の告知（テーブル10件）
- 列：**時刻｜文面（先頭）｜クリック｜増えた人（推定）｜結果（送信済み/失敗）**
- 行アクション：**「この文面でまた投稿」**（編集画面プリセット起動）

### F. アラート（上部）
- **Xの連携が切れています**（再接続導線）
- **ブラウザ通知が無効です**（有効化導線）
> **表示しない**：残量不足・Discordへの自動切替

### 受入基準（この小節の反映確認）
- [ ] Aの**承認待ち**と**次のおすすめ**が表示され、各CTAが機能する
- [ ] Bのカードが**2枚のみ**（呼べた人／リンクを押した人）である
- [ ] Cに「効いたチャンネル」が存在しない（A/B・時間帯のみ）
- [ ] Dは**1枚の折れ線**＋告知マーカー表示
- [ ] Eのテーブル列が指定どおりで、行アクション「この文面でまた投稿」が動作
- [ ] Fは**X連携切れ**と**Push無効**のみ



---

## 19. 認証・アカウント方針（v0.4 / Twitchログインのみ）
> 仕様変更：**ログインはTwitch OAuthのみ**。プロフィールはTwitchから取得。**「アカウント削除」は提供せず、ログアウト＋連携解除のみ**。

### 19.1 ログイン方式
- **方式**：Twitch OAuth 2.0（Authorization Code + PKCE）
- **実装**：Supabase Auth の Twitch プロバイダを使用（`signInWithOAuth({ provider: 'twitch' })`）
- **スコープ**：初期は**スコープなし**（表示名・アイコン等の取得に十分）。将来、メール送信等が必要なら `user:read:email` を追加

### 19.2 プロフィール取得・同期
- **取得API**：Twitch Helix `Get Users`
- **保存フィールド（最小）**：
  - `twitch_user_id`（= broadcaster_id）※一意
  - `login`（例：ilohas1605）
  - `display_name`
  - `profile_image_url`
  - `broadcaster_type`（partner/affiliate/none）
  - `email`（※`user:read:email` 付与時のみ）
- **同期タイミング**：
  - ログイン直後（初回作成 or 更新）
  - 1日1回のバックグラウンド同期（アイコン・表示名の更新に追随）
- **UI**：設定＞プロフィールに**読み取り専用**で表示。編集は不可（Twitch側の値を反映）

### 19.3 X（Twitter）連携はログインと分離
- **目的**：本人性の担保（Twitch）と投稿権限（X）を分離して分かりやすくする
- **Xの権限**：`tweet.write users.read offline.access`（最小権限）
- **UIボタン**：
  - **「Xを接続」**（接続済みなら「接続済み」表示と**「解除」**ボタン）
  - 連携テスト（疎通チェック）

### 19.4 ログアウトと連携解除（「アカウント削除」は無し）
- **ログアウト**：セッション終了（Supabase Authのサインアウト）。設定＞危険操作に**「ログアウト」**のみを表示
- **連携解除**：
  - **Twitch連携解除**：当アプリに保持するTwitchリフレッシュトークン等を削除（必要に応じてTwitch側リボークAPI）
  - **X連携解除**：Xトークンを削除（可能ならリボーク）
- **データ保持**：配信・クリック・告知履歴は保持（利用規約に明記）。完全削除要望は**問い合わせ窓口**で手動対応（MVP）
- **UIから「アカウント削除」項目は排除**

### 19.5 画面フロー（日本語ラベル）
1) **「Twitchでログイン」** → 認可 → 戻りでプロフィール同期 → **ダッシュボードへ**
2) ダッシュボード or 連携ページで **「Xを接続」**（任意）
3) 設定ページ：プロフィール（読み取り専用）／通知設定／**ログアウト**／（各連携の**解除**）

### 19.6 データモデルへの反映
- `profiles` に以下を追加/確認：`twitch_user_id text unique not null`, `login text`, `display_name text`, `profile_image_url text`, `broadcaster_type text`, `email text null`
- `twitch_accounts` を使用している場合は `broadcaster_id unique` を**TwitchユーザーID**として統一

### 19.7 受入基準
- [ ] **Twitchでログイン**でき、初回でプロフィールが作成・表示される
- [ ] 設定＞プロフィールは**読み取り専用**で、Twitch側の変更が翌日に反映される
- [ ] 連携ページで**「Xを接続／解除」**が動作する（投稿可／不可が切り替わる）
- [ ] 設定に**「ログアウト」**があり、ログアウトでセッションが完全に終了する
- [ ] **「アカウント削除」項目がUI上に存在しない**



---

## 19.8 Supabase Auth 設定値（Twitch / 本番・開発）
> **ログイン＝Twitchのみ**。Supabase Auth に Twitch Provider を設定し、Twitch Dev Console 側にもリダイレクトURLを登録する。

### 19.8.1 Supabase 側（Dashboard → Authentication）
- **URL Configuration**
  - **Site URL（本番）**：`https://castcue.example`
  - **Additional Redirect URLs**：
    - `https://castcue.example/*`
    - `http://localhost:3000/*`（開発）
- **Providers → Twitch**
  - **Client ID**：`<Twitch Client ID>`
  - **Client Secret**：`<Twitch Client Secret>`
  - **Authorize URL**：（既定）
  - **Token URL**：（既定）
  - **User Info URL**：（既定）
  - **Scopes**：**空**（初期は不要）
  - **Redirect URL（固定）**：`https://<PROJECT_REF>.supabase.co/auth/v1/callback`  
    ※Supabase が OAuth コールバックを受けるURL。**Twitch側にも同一URLを登録すること**。

### 19.8.2 アプリ側（Next.js）
- **サインイン呼び出し**（例）
  ```ts
  supabase.auth.signInWithOAuth({
    provider: 'twitch',
    options: { redirectTo: 'https://castcue.example/' } // dev: http://localhost:3000/
  })
  ```
- **環境変数**（既存に加えて確認）
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
  ```

---

## 19.9 Twitch Developer Console 設定（ログイン＋EventSub）
**対象**：https://dev.twitch.tv/console/apps のアプリ

### 19.9.1 OAuth（ログイン）
- **OAuth Redirect URLs**：
  - 本番：`https://<PROJECT_REF>.supabase.co/auth/v1/callback`
  - 開発：`http://localhost:54321/auth/v1/callback`（Supabase ローカル使用時）または `http://localhost:3000` 経由の場合は Supabase 上に開発用プロジェクトを作成し、その **PROJECT_REF** の Callback を登録
- **Category**：`Application Integration`（任意）
- **Client ID / Secret**：Supabase にコピー
- **追加スコープ**（将来）：メールが必要なら `user:read:email`

### 19.9.2 EventSub（配信開始検知）
- **Transport / Callback**：`https://castcue.example/api/twitch/webhook`
- **Secret**：`.env` の `TWITCH_WEBHOOK_SECRET` と同一文字列
- **Event Types（MVP）**：`stream.online`
- **Condition**：`broadcaster_user_id = <profiles.twitch_user_id>`
- **トークン**：**App Access Token** を使用（Client Credentials Flow）

---

## 19.10 X（Twitter）Developer Portal 設定（投稿用 OAuth2）
**対象**：X Developer Portal → Project / App

- **App Type**：`Web App`
- **User authentication settings**：
  - **OAuth 2.0**：**ON**（PKCE）
  - **Callback URI / Redirect URL**：
    - 本番：`https://castcue.example/api/x/oauth/callback`
    - 開発：`http://localhost:3000/api/x/oauth/callback`
  - **Website URL**：`https://castcue.example`
  - **Scopes**：`tweet.write`, `users.read`, `offline.access`
  - **App permissions**：`Read and write`
- **Keys & tokens**：`X_CLIENT_ID` / `X_CLIENT_SECRET` を `.env` に設定

---

## 19.11 参考：環境変数の最終チェックリスト
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Twitch (OAuth + EventSub)
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
TWITCH_WEBHOOK_SECRET=long-random-string
# （必要に応じて App Access Token を起動時に取得 or キャッシュ）

# X (Twitter) OAuth2
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=https://castcue.example/api/x/oauth/callback

# Web Push (VAPID)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}

# App
APP_ORIGIN=https://castcue.example
NEXT_PUBLIC_SITE_URL=https://castcue.example
```

---

## 19.12 動作確認（最短テスト手順）
1) **Twitchログイン**：トップの「Twitchでログイン」→ダッシュボード到達、設定＞プロフィールに表示名とアイコンが出る
2) **EventSub**：`scripts/subscribe.ts` で `stream.online` を購読 → テスト配信で `/api/twitch/webhook` が 204 を返す
3) **Push**：設定で Web Push を有効化 → テスト通知でバナー表示 → クリックで `/approve/<draftId>` が開く
4) **X連携**：「Xを接続」→許可→テンプレからテスト投稿→`deliveries` に `sent` が記録
5) **ログアウト**：設定＞危険操作→「ログアウト」でセッションが終了

