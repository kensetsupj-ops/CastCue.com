# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Key generation (required for setup)
npx web-push generate-vapid-keys                                              # Generate VAPID keys for Web Push
node -e "console.log('base64:' + require('crypto').randomBytes(32).toString('base64'))"  # Generate encryption key
```

## Architecture Overview

### Event-Driven Flow
CastCue は Twitch 配信開始をトリガーに、複数のシステムが連携する event-driven アーキテクチャです：

```
Twitch Stream Start
  → EventSub Webhook (署名検証)
    → Draft 作成 (pending status)
      → Web Push 通知送信
        → ユーザーアクション
          ├─ "テンプレートで投稿" → auto-post API → X 投稿 + サンプリング開始
          └─ "編集して投稿" → 編集画面 → 手動投稿
```

### OAuth Token Management
X API トークンは **AES-256-GCM で暗号化**して `x_connections` テーブルに保存。`lib/x.ts` の `getUserAccessToken()` が自動で有効期限チェック＋リフレッシュを行います。すべての X API 呼び出しはこの関数経由でトークンを取得してください。

### Database Access Patterns
- **クライアント側**: `supabase` (anon key) - RLS が有効、ユーザーは自分のデータのみアクセス
- **API Routes**: `supabaseAdmin` (service role) - RLS をバイパス、Webhook など外部からの呼び出しで使用
- トークンの暗号化/復号化は `lib/crypto.ts` を使用

### Short URL System
`lib/link.ts` で短縮 URL 生成。`app/l/[shortCode]/route.ts` でリダイレクト時に `clicks` テーブルへ UA/Referrer を記録。投稿前に `replaceWithShortLink()` で Twitch URL を短縮 URL に置換し、クリック追跡を実現。

### Sampling & Lift Calculation
`lib/sampling.ts` の `sampleViewerCount()` を定期実行（Cron 推奨）して視聴者数をサンプリング。`calculateLift()` で投稿前後の平均視聴者数差分（リフト効果）を算出。

## Critical Implementation Details

### Webhook Signature Verification
`app/api/twitch/webhook/route.ts` では **必ず** `verifyTwitchSignature()` で HMAC-SHA256 署名を検証してから処理を進めること。署名検証失敗時は 403 を返す。

### Service Worker Actions
`public/sw.js` の通知アクションボタン：
- `action: 'template'` → `/api/drafts/auto-post` を POST
- `action: 'edit'` → `/approve/[draftId]` へナビゲート

通知ペイロードには必ず `draftId` を含めること。

### Template Variable Substitution
テンプレートエンジンは単純な `String.replace()` を使用。現在サポートされている変数：
- `{配信タイトル}` - 配信タイトル（推奨、ユーザーフレンドリー）
- `{title}` - 配信タイトル（後方互換性のため残存）

**UI動作:**
- テンプレート作成画面で「配信タイトルを挿入」ボタンをクリックすると、本文に `{配信タイトル}` プレースホルダーが挿入されます
- プレビュー欄では、`{配信タイトル}` が前回の配信タイトルで自動的に置き換わり、実際の投稿イメージを確認できます
- 実際の投稿時には、リアルタイムの配信タイトルに置換されます

**重要:**
- Twitch URLは自動的に投稿の最後に追加されるため、テンプレート本文に `{twitch_url}` を含める必要はありません。システムが変数置換後に `\n{twitch_url}` を自動追加します。
- プレビュー機能により、ユーザーは変数がどのように展開されるかを視覚的に確認できます

新しい変数を追加する場合は以下のファイルを更新：
1. `app/api/drafts/auto-post/route.ts` - 自動投稿時の変数置換
2. `app/api/drafts/[draftId]/route.ts` - Draft詳細取得時の変数置換
3. `app/(dashboard)/templates/page.tsx` - プレビュー表示の変数置換

### Custom Dialog Pattern
**ブラウザダイアログの使用禁止**: `window.confirm()`, `window.alert()`, `window.prompt()` は使用しないこと。すべての確認ダイアログはカスタムUIで実装します。

**実装パターン**:
```tsx
// 状態管理
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
const [pendingAction, setPendingAction] = useState<ActionType | null>(null);

// 確認ダイアログUI
{showConfirmDialog && (
  <Card className="border-primary">
    <CardContent className="pt-6">
      <div className="space-y-4">
        <p className="text-neutral-ink font-medium">
          確認メッセージ
        </p>
        <div className="flex gap-2">
          <Button onClick={handleConfirm} variant="default">
            実行
          </Button>
          <Button onClick={handleCancel} variant="outline">
            キャンセル
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

**カラースキーム**:
- 確認操作: `border-primary` (青枠)
- 危険操作: `border-danger` (赤枠) + `bg-danger` (赤ボタン)

参考実装: `app/(dashboard)/templates/page.tsx:386-424`

### Environment-Specific Behavior
開発環境では `localhost:3000` だが、X OAuth callback は公開 URL が必要。`dev.castcue.com` など Vercel preview deployment または Cloudflare Tunnel を使用すること。

## Key Files & Their Roles

- `lib/x.ts` - X API クライアント、OAuth 2.0 PKCE 実装、自動トークンリフレッシュ
- `lib/twitch.ts` - Twitch API クライアント、EventSub 署名検証、Stream 情報取得
- `lib/push.ts` - Web Push 送信、購読管理、無効な購読の自動削除
- `lib/crypto.ts` - AES-256-GCM 暗号化/復号化、OAuth トークン保護
- `lib/link.ts` - 短縮 URL 生成、ユニークコード生成、クリック追跡
- `lib/sampling.ts` - 視聴者数サンプリング、リフト効果算出、配信終了検知
- `lib/ab-test.ts` - テンプレート選択ロジック（デフォルトまたは最新のテンプレートを選択）
- `app/api/twitch/webhook/route.ts` - Twitch EventSub エントリーポイント、Draft 作成
- `app/api/drafts/auto-post/route.ts` - 自動投稿エンドポイント、Service Worker から呼ばれる
- `app/api/drafts/[draftId]/route.ts` - Draft 詳細取得、編集用テンプレート生成
- `app/api/streams/route.ts` - 配信履歴取得、ダミーデータ自動生成（開発用）
- `app/api/settings/default-template/route.ts` - デフォルトテンプレート設定・取得、ユーザー設定管理
- `app/api/reports/route.ts` - レポートデータ取得、動的テンプレート名表示、ダミーデータ生成
- `app/(dashboard)/templates/page.tsx` - テンプレート管理UI、カスタムダイアログ実装、プレースホルダー挿入とプレビュー機能、デフォルトテンプレート設定フロー
- `public/sw.js` - Service Worker、通知表示とアクションハンドリング

## Data Flow Patterns

### 配信開始から投稿まで
1. Twitch EventSub → `POST /api/twitch/webhook`
2. 署名検証 → メッセージID重複チェック
3. broadcaster_id → user_id 変換 (`twitch_accounts`)
4. Twitch API で配信情報取得（title, thumbnail）
5. `streams` レコード作成
6. `drafts` レコード作成（status: pending）
7. `sendDraftNotification()` で Web Push 送信
8. ユーザーが "テンプレートで投稿" クリック → Service Worker → `POST /api/drafts/auto-post`
9. テンプレート取得（デフォルト設定または most recently created）
10. テンプレート変数置換（{配信タイトル}, {title}など）
11. Twitch URL を自動的に本文の最後に追加
12. 短縮 URL 生成
13. X 投稿
14. `deliveries` レコード作成（template_id を記録）
15. `drafts.status = posted`
16. `startSampling()` で視聴者数サンプリング開始

### OAuth Token Lifecycle
1. `POST /api/x/oauth/start` - PKCE code_verifier 生成、Cookie 保存、認証 URL 返却
2. ユーザーが X で認証 → `GET /api/x/oauth/callback`
3. state 検証 → code_verifier 取得 → Token Exchange
4. Token 暗号化 → `x_connections` に保存（expires_at 記録）
5. API 呼び出し時 → `getUserAccessToken()` が有効期限チェック
6. 期限切れなら refresh_token で新トークン取得 → 再暗号化して保存

### デフォルトテンプレート管理
1. ユーザーがテンプレートを保存（新規作成 or 編集）
2. 保存成功後、カスタム確認ダイアログを表示
   - 「{テンプレート名}をデフォルトテンプレートに設定しますか？」
   - 選択肢: 「デフォルトに設定」 or 「スキップ」
3. **デフォルトに設定を選択した場合**:
   - `POST /api/settings/default-template` に `template_id` を送信
   - テンプレートの所有権確認（`templates` テーブルで `user_id` 照合）
   - `user_settings` テーブルに upsert（`onConflict: user_id`）
   - フロントエンドの `defaultTemplateId` 状態を更新
   - ページトップへスクロール
   - 「{テンプレート名}がデフォルトに設定されました」メッセージ表示
4. **スキップを選択した場合**:
   - 「テンプレートを保存しました」メッセージ表示
5. UI でテンプレートカードに青枠線と「適用中」バッジを表示
6. 自動投稿時（`/api/drafts/auto-post`）、`lib/ab-test.ts` の `selectTemplate()` がデフォルトテンプレートを優先的に選択

**テンプレート一覧からの設定**:
- 各テンプレートカードの「このテンプレートを使用」ボタンをクリック
- 即座にデフォルトテンプレートとして設定（確認なし）

**重要:** デフォルトテンプレートが設定されていない場合は、最新のテンプレート（`created_at DESC` で最初のもの）が使用されます。

### レポート動的生成（ダミーデータ）
1. `/api/reports` がユーザーの配信データ（deliveries）を取得
2. 実データがある場合、deliveries から template_id を使用してテンプレート名を取得
3. 実データがない場合、ダミーデータ生成フローに進む：
   - ユーザーのテンプレート一覧を取得（`templates` テーブル）
   - テンプレートIDから名前へのマップを作成
   - 12件のダミー配信データを用意
   - ダミーデータをユーザーのテンプレートに振り分け（`index % templates.length`）
   - 1テンプレートなら全12件、2テンプレートなら各6件、3テンプレートなら各4件...
4. テンプレート別統計を動的に集計（平均呼べた人数、平均クリック数、平均経由率）
5. フロントエンドがテンプレート数に応じて動的にパフォーマンスカードを表示

## Common Pitfalls

### X API OAuth
- localhost は使用不可。開発環境では `dev.castcue.com` など公開 URL を設定
- Callback URI は完全一致（ポート番号、末尾スラッシュまで）
- App permissions は **Read and write** 必須（ツイート投稿に必要）
- 権限変更時はユーザーの再認証が必要

### Supabase RLS
- クライアント側コードでは `supabase` を使用、RLS が有効
- API Routes（特に Webhook）では `supabaseAdmin` を使用
- RLS ポリシーが正しく設定されていないと 403 エラー
- 開発中は一時的に RLS を無効化できるが、本番では必ず有効化

### VAPID Keys
- 本番環境では必ず新しいキーペアを生成
- Public Key と Private Key は対になっている必要がある
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` と `VAPID_PUBLIC_KEY` は同じ値

### Encryption Key
- `DATA_ENCRYPTION_KEY` は一度設定したら絶対に変更しない
- 変更すると既存の暗号化データが復号化できなくなる
- `base64:` プレフィックス必須

## Documentation References

**重要**: 作業を開始する前に、必ず `docs/` ディレクトリ内の関連ドキュメントを参照してください。このファイルは概要のみを提供しており、詳細な実装手順やトラブルシューティングは各ドキュメントに記載されています。

詳細なドキュメント：
- `docs/setup/env-variables.md` - 環境変数の詳細設定
- `docs/setup/external-services.md` - Twitch/X/Supabase のセットアップ手順
- `docs/api/internal-api.md` - 全エンドポイント仕様
- `docs/database/schema.md` - テーブル定義と SQL
- `docs/architecture/data-flow.md` - データフロー図と処理詳細
- `docs/development/troubleshooting.md` - よくある問題と解決策
- `docs/deployment/vercel-setup.md` - Vercel デプロイ手順
- `docs/TASKS.md` - タスク一覧と実装状況

## Task Management

**タスク完了時の必須チェック:**
1. `docs/TASKS.md` を開く
2. 完了したタスクのステータスを `📋` → `✅` に変更
3. 関連する実装詳細をコメントとして追加（ファイルパス、重要な変更点など）
4. 新たに発見した未実装タスクがあれば追加

**例:**
```markdown
- ✅ **X投稿API連携** - ツイート投稿機能
  - ファイル: `app/api/drafts/auto-post/route.ts`
  - 実装済み: 自動投稿、短縮URL生成、サンプリング開始
```

タスクの進捗を常に最新に保つことで、プロジェクト全体の状況を把握しやすくなります。

## Package Manager

このプロジェクトは **npm** を使用します（READMEに pnpm と記載されていますが、`package.json` と一貫性を保つため npm を推奨）。
