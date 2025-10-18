# CastCue

**Your live, on cue.**

CastCue は、Twitch 配信の開始を自動検知し、X (Twitter) と Discord へ即座に通知を送信するサービスです。短縮 URL とクリック計測により、告知の効果（リフト）を可視化します。

## 主な機能

- **自動配信検知**: Twitch EventSub で配信開始を即時検知（目標: p95 ≤ 5秒）
- **自動告知**: X (Twitter) と Discord へ自動投稿
- **クォータ管理**: X Free プラン（500/月）を公平に配分（招待制運用）
- **リフト可視化**: 告知前後の同接変化を計測・表示
- **短縮 URL**: クリック計測用の短縮 URL を自動生成
- **Web Push 通知**: 配信開始時にブラウザ通知（レビュー承認モード）
- **テンプレート比較**: 複数のテンプレートの効果を比較・分析
  - プレースホルダー機能: `{配信タイトル}` で動的な内容を挿入
  - リアルタイムプレビュー: 実際の投稿イメージを確認しながら編集

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI コンポーネント**: shadcn/ui, Radix UI
- **バックエンド**: Next.js Route Handlers
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **デプロイ**: Vercel
- **外部 API**: Twitch EventSub, X API v2, Discord Webhooks

## セットアップ

### 前提条件

- Node.js 18+ または 20+
- npm 10+
- Supabase アカウント
- Twitch Developer アカウント
- X Developer アカウント

### 1. プロジェクトのクローンとインストール

\`\`\`bash
git clone <repository-url>
cd CastCue
npm install
\`\`\`

### 2. 環境変数の設定

\`.env.example\` を \`.env.local\` にコピーして、必要な値を設定します：

\`\`\`bash
cp .env.example .env.local
\`\`\`

必要な環境変数：

- **Supabase**: \`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\`
- **Twitch**: \`TWITCH_CLIENT_ID\`, \`TWITCH_CLIENT_SECRET\`, \`TWITCH_WEBHOOK_SECRET\`
- **X (Twitter)**: \`X_CLIENT_ID\`, \`X_CLIENT_SECRET\`, \`X_REDIRECT_URI\`
- **Web Push**: \`VAPID_PUBLIC_KEY\`, \`VAPID_PRIVATE_KEY\`, \`VAPID_SUBJECT\`
- **暗号化**: \`DATA_ENCRYPTION_KEY\`
- **Cron認証**: \`CRON_SECRET\` ⚠️ 本番環境では必須

⚠️ **本番運用前に必須対応**:

1. **Upstash Redis (レート制限)**
   - 現在のレート制限はインメモリ実装のため、Vercel環境では**効果がありません**
   - 本番運用前にUpstash Redisへの移行が必須です
   - 詳細: \`docs/deployment/upstash-setup.md\`
   - 所要時間: 15分 / コスト: 無料（10,000 commands/day）

2. **Cron Jobの設定**
   - \`CRON_SECRET\`を安全なランダム値で生成してください
   - 生成コマンド: \`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\`

詳細な本番デプロイ手順: \`QUICKSTART.md\` または \`docs/deployment/vercel-deployment.md\`

### 3. VAPID キーの生成

\`\`\`bash
npx web-push generate-vapid-keys
\`\`\`

出力された公開鍵と秘密鍵を \`.env.local\` に設定します。

### 4. 暗号化キーの生成

\`\`\`bash
node -e "console.log('base64:' + require('crypto').randomBytes(32).toString('base64'))"
\`\`\`

出力された値を \`DATA_ENCRYPTION_KEY\` に設定します。

### 5. Supabase のセットアップ

#### ローカル開発の場合

\`\`\`bash
npx supabase init
npx supabase start
npx supabase db push
\`\`\`

#### Supabase Cloud の場合

1. [Supabase Dashboard](https://app.supabase.com) でプロジェクトを作成
2. \`supabase/migrations/20250109_initial_schema.sql\` を SQL Editor で実行
3. API キーを \`.env.local\` に設定

### 6. 開発サーバーの起動

\`\`\`bash
npm run dev
\`\`\`

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## デプロイ

### Vercel へのデプロイ

詳細な手順は \`QUICKSTART.md\` を参照してください。

**簡易手順**:
1. GitHub リポジトリに push
2. [Vercel](https://vercel.com) で新規プロジェクトをインポート
3. 環境変数を設定
4. デプロイ

### Cron Jobs の設定

#### Vercel Cron（月次クォータリセット）
- \`vercel.json\` に定義済み: 毎月1日 00:00 にクォータリセット

#### GitHub Actions（サンプリング - Hobby plan対応）
**重要**: Vercel Hobby planでは5分ごとのcronが使えません。

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. 以下のシークレットを追加：
   - \`APP_URL\`: デプロイURL（例: \`https://castcue.vercel.app\`）
   - \`CRON_SECRET\`: Vercel環境変数と同じ値

詳細: \`QUICKSTART.md\` の「🔧 Cron Jobs設定」セクション

### Webhook の設定

デプロイ後、Twitch Webhook の callback URL を設定します：

\`\`\`
https://your-domain.vercel.app/api/twitch/webhook
\`\`\`

## ディレクトリ構造

\`\`\`
CastCue/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # ダッシュボードレイアウト
│   │   ├── dashboard/           # ダッシュボードページ
│   │   ├── reports/             # レポートページ
│   │   ├── streams/             # 配信一覧ページ
│   │   └── ...                  # その他のページ
│   ├── api/                     # API Routes
│   │   ├── twitch/              # Twitch 関連 API
│   │   ├── dispatch/            # 通知ディスパッチ
│   │   ├── x/                   # X OAuth
│   │   ├── push/                # Web Push
│   │   └── quota/               # クォータ管理
│   └── l/[code]/                # 短縮 URL リダイレクト
├── components/                  # React コンポーネント
│   ├── ui/                      # UI コンポーネント
│   └── layout/                  # レイアウトコンポーネント
├── lib/                         # ライブラリ・ユーティリティ
│   ├── db.ts                    # Supabase クライアント
│   ├── twitch.ts                # Twitch API クライアント
│   ├── x.ts                     # X API クライアント
│   ├── discord.ts               # Discord Webhook
│   ├── quota.ts                 # クォータ管理
│   ├── crypto.ts                # 暗号化ユーティリティ
│   └── utils.ts                 # 汎用ユーティリティ
├── public/                      # 静的ファイル
│   ├── sw.js                    # Service Worker
│   └── manifest.json            # PWA マニフェスト
└── supabase/                    # Supabase 設定
    ├── config.toml              # Supabase 設定
    └── migrations/              # データベースマイグレーション
\`\`\`

## API エンドポイント

### Webhook

- \`POST /api/twitch/webhook\` - Twitch EventSub webhook

### 通知

- \`POST /api/dispatch\` - 通知のディスパッチ
- \`GET /l/:code\` - 短縮 URL リダイレクト

### 認証

- \`POST /api/x/oauth/start\` - X OAuth 開始
- \`GET /api/x/oauth/callback\` - X OAuth コールバック

### クォータ

- \`GET /api/quota?user_id=xxx\` - クォータ情報取得

### Twitch

- \`POST /api/twitch/subscribe\` - EventSub 購読作成
- \`DELETE /api/twitch/subscribe?subscription_id=xxx\` - EventSub 購読削除

### Web Push

- \`POST /api/push/register\` - Push 通知購読登録
- \`DELETE /api/push/register?endpoint=xxx\` - Push 通知購読解除

### ドラフト

- \`POST /api/drafts/skip\` - ドラフトをスキップ

## データベーススキーマ

主要なテーブル：

- \`profiles\` - ユーザープロフィール
- \`twitch_accounts\` - Twitch アカウント連携
- \`x_connections\` - X (Twitter) 連携（暗号化トークン）
- \`discord_webhooks\` - Discord Webhook URL
- \`streams\` - 配信記録
- \`samples\` - 同接サンプリング（1分間隔）
- \`templates\` - 通知テンプレート
- \`deliveries\` - 通知配信記録
- \`links\` - 短縮 URL
- \`clicks\` - クリックログ
- \`quotas\` - 月間クォータ管理
- \`drafts\` - 通知ドラフト（レビュー承認モード）
- \`push_subscriptions\` - Web Push 購読情報

## セキュリティ

- **OAuth トークン暗号化**: X のアクセストークンは AES-256-GCM で暗号化して保存
- **RLS (Row Level Security)**: Supabase で有効化、ユーザーは自分のデータのみアクセス可能
- **HMAC 署名検証**: Twitch Webhook の署名を検証
- **HTTPS 必須**: 本番環境では HTTPS のみ使用

## ライセンス

MIT

## お問い合わせ

- GitHub Issues: [https://github.com/your-org/castcue/issues](https://github.com/your-org/castcue/issues)
