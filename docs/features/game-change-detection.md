# ゲーム変更検出機能 要件定義

## 概要

Twitch配信中にストリーマーがプレイするゲーム（カテゴリ）を変更した際に、自動でX投稿と通知を送信する機能。

---

## ユースケース

### シナリオ
1. ストリーマーが「Apex Legends」で配信開始
2. CastCueが配信開始を検出 → X投稿
3. 配信中に「Valorant」にゲーム変更
4. **CastCueがゲーム変更を検出 → 新たにX投稿**
5. フォロワーに「今はValorantをプレイ中」と通知

### 期待効果
- ゲーム別のフォロワーに適切にリーチ
- 配信内容の変化を即座に告知
- 視聴者の取りこぼし防止

---

## 機能要件

### 1. ゲーム変更検出

#### 1.1 Twitch EventSub設定
**使用イベント**: `stream.update`
- 配信のタイトル、カテゴリ、言語などが更新された時にトリガー

**購読条件**:
```json
{
  "type": "stream.update",
  "version": "1",
  "condition": {
    "broadcaster_user_id": "12826"
  }
}
```

#### 1.2 変更検出ロジック
```typescript
// app/api/twitch/webhook/route.ts

if (event.subscription.type === 'stream.update') {
  const currentGame = event.event.category_name;
  const previousGame = await getPreviousGame(streamId);

  if (currentGame !== previousGame) {
    // ゲーム変更を検出
    await handleGameChange(streamId, previousGame, currentGame);
  }
}
```

### 2. 通知システム

#### 2.1 Web Push通知
**通知内容**:
```javascript
{
  title: "🎮 ゲーム変更: {streamer_name}",
  body: "{previous_game} → {current_game}",
  icon: "/icons/game-change.png",
  actions: [
    { action: "post", title: "テンプレートで投稿" },
    { action: "edit", title: "編集して投稿" },
    { action: "skip", title: "スキップ" }
  ]
}
```

#### 2.2 Draft作成
**新しいDraftタイプ**: `game_change`

```sql
CREATE TYPE draft_type AS ENUM ('stream_start', 'game_change');

ALTER TABLE drafts
  ADD COLUMN draft_type draft_type DEFAULT 'stream_start',
  ADD COLUMN previous_category VARCHAR(255),
  ADD COLUMN new_category VARCHAR(255);
```

### 3. テンプレートシステム拡張

#### 3.1 新しいテンプレート変数
既存変数:
- `{title}` - 配信タイトル
- `{twitch_url}` - 配信URL
- `{category}` - カテゴリ名

**追加変数**:
- `{previous_category}` - 変更前のゲーム
- `{new_category}` - 変更後のゲーム
- `{change_time}` - 変更時刻

#### 3.2 テンプレート例
```
🎮 ゲーム変更しました！

{previous_category} → {new_category}

引き続き配信中です 👀
{twitch_url}

#TwitchJP #{new_category}
```

### 4. スパム防止機能

#### 4.1 クールダウン期間
**要件**: 短時間に複数回ゲーム変更した場合、投稿を制限

**実装**:
```typescript
const GAME_CHANGE_COOLDOWN = 10 * 60 * 1000; // 10分

async function canNotifyGameChange(streamId: string): Promise<boolean> {
  const lastNotification = await getLastGameChangeNotification(streamId);

  if (!lastNotification) return true;

  const timeSinceLastNotification = Date.now() - lastNotification.created_at;
  return timeSinceLastNotification >= GAME_CHANGE_COOLDOWN;
}
```

#### 4.2 設定オプション
ユーザーが設定可能:
- ゲーム変更通知の有効/無効
- クールダウン時間（5分/10分/30分）
- 特定ゲームのみ通知

---

## 技術仕様

### 1. データベーススキーマ

#### 1.1 `streams` テーブル拡張
```sql
ALTER TABLE streams
  ADD COLUMN current_category VARCHAR(255),
  ADD COLUMN previous_category VARCHAR(255),
  ADD COLUMN category_changed_at TIMESTAMPTZ;
```

#### 1.2 `game_change_events` テーブル（新規）
```sql
CREATE TABLE game_change_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  previous_category VARCHAR(255),
  new_category VARCHAR(255) NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  draft_id UUID REFERENCES drafts(id),
  notified BOOLEAN DEFAULT FALSE,

  CONSTRAINT fk_stream
    FOREIGN KEY (stream_id)
    REFERENCES streams(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_game_change_stream ON game_change_events(stream_id);
CREATE INDEX idx_game_change_detected ON game_change_events(detected_at DESC);
```

#### 1.3 `user_settings` テーブル拡張
```sql
ALTER TABLE user_settings
  ADD COLUMN notify_game_change BOOLEAN DEFAULT TRUE,
  ADD COLUMN game_change_cooldown INTEGER DEFAULT 600, -- 秒単位
  ADD COLUMN game_change_whitelist TEXT[]; -- 特定ゲームのみ通知
```

### 2. API エンドポイント

#### 2.1 Webhook処理
**エンドポイント**: `POST /api/twitch/webhook`

**処理フロー**:
```typescript
// stream.update イベント
1. イベント受信
2. 現在のカテゴリを取得
3. DBから前回のカテゴリを取得
4. 比較して変更を検出
5. クールダウンチェック
6. Draft作成
7. Web Push通知送信
8. streams テーブル更新
9. game_change_events レコード作成
```

#### 2.2 設定API
**エンドポイント**: `POST /api/settings/game-change`

**リクエスト**:
```json
{
  "notify_game_change": true,
  "game_change_cooldown": 600,
  "game_change_whitelist": ["Apex Legends", "Valorant"]
}
```

#### 2.3 履歴取得API
**エンドポイント**: `GET /api/streams/{streamId}/game-changes`

**レスポンス**:
```json
{
  "game_changes": [
    {
      "id": "uuid",
      "previous_category": "Apex Legends",
      "new_category": "Valorant",
      "detected_at": "2025-10-12T10:30:00Z",
      "notified": true
    }
  ]
}
```

### 3. ライブラリ変更

#### 3.1 `lib/twitch.ts` 拡張
```typescript
/**
 * ゲーム変更を検出して処理
 */
export async function handleGameChange(
  streamId: string,
  previousCategory: string | null,
  newCategory: string
): Promise<void> {
  // クールダウンチェック
  const canNotify = await canNotifyGameChange(streamId);
  if (!canNotify) {
    console.log('Game change cooldown active, skipping notification');
    return;
  }

  // ユーザー設定チェック
  const settings = await getUserSettings(userId);
  if (!settings.notify_game_change) {
    return;
  }

  // ホワイトリストチェック
  if (settings.game_change_whitelist?.length > 0) {
    if (!settings.game_change_whitelist.includes(newCategory)) {
      return;
    }
  }

  // Draft作成
  const draft = await createGameChangeDraft({
    streamId,
    previousCategory,
    newCategory,
    draftType: 'game_change'
  });

  // 通知送信
  await sendGameChangeNotification(draft);

  // イベント記録
  await recordGameChangeEvent({
    streamId,
    previousCategory,
    newCategory,
    draftId: draft.id
  });
}
```

#### 3.2 `lib/push.ts` 拡張
```typescript
/**
 * ゲーム変更通知を送信
 */
export async function sendGameChangeNotification(draft: Draft) {
  const notification = {
    title: `🎮 ゲーム変更: ${draft.streamer_name}`,
    body: `${draft.previous_category} → ${draft.new_category}`,
    icon: '/icons/game-change.png',
    badge: '/icons/badge.png',
    tag: `game-change-${draft.stream_id}`,
    data: {
      draftId: draft.id,
      type: 'game_change',
      url: `/approve/${draft.id}`
    },
    actions: [
      { action: 'post', title: 'テンプレートで投稿' },
      { action: 'edit', title: '編集して投稿' },
      { action: 'skip', title: 'スキップ' }
    ]
  };

  await sendPushToUser(draft.user_id, notification);
}
```

### 4. EventSub 購読管理

#### 4.1 購読の追加
**エンドポイント**: `POST /api/twitch/subscribe`

```typescript
// 既存の stream.online に加えて stream.update も購読
const subscriptions = [
  {
    type: 'stream.online',
    version: '1',
    condition: { broadcaster_user_id: broadcasterId }
  },
  {
    type: 'stream.update', // 新規追加
    version: '1',
    condition: { broadcaster_user_id: broadcasterId }
  }
];
```

---

## UI/UX要件

### 1. 設定画面 (`/settings`)

#### 新しい設定セクション
```tsx
<Card>
  <CardHeader>
    <CardTitle>ゲーム変更通知</CardTitle>
  </CardHeader>
  <CardContent>
    <div>
      <label>
        <input type="checkbox" checked={notifyGameChange} />
        ゲーム変更時に通知を送信
      </label>
    </div>

    <div>
      <label>クールダウン時間</label>
      <select value={cooldown}>
        <option value="300">5分</option>
        <option value="600">10分</option>
        <option value="1800">30分</option>
      </select>
    </div>

    <div>
      <label>通知するゲーム（空欄で全て）</label>
      <input
        type="text"
        placeholder="Apex Legends, Valorant"
        value={whitelist}
      />
    </div>
  </CardContent>
</Card>
```

### 2. 配信履歴 (`/streams`)

#### ゲーム変更履歴の表示
```tsx
<Timeline>
  <TimelineItem>
    <TimelineIcon>🚀</TimelineIcon>
    <TimelineContent>
      配信開始: Apex Legends
      <TimelineTime>10:00</TimelineTime>
    </TimelineContent>
  </TimelineItem>

  <TimelineItem>
    <TimelineIcon>🎮</TimelineIcon>
    <TimelineContent>
      ゲーム変更: Apex Legends → Valorant
      <TimelineTime>10:30</TimelineTime>
    </TimelineContent>
  </TimelineItem>

  <TimelineItem>
    <TimelineIcon>🎮</TimelineIcon>
    <TimelineContent>
      ゲーム変更: Valorant → Minecraft
      <TimelineTime>11:00</TimelineTime>
    </TimelineContent>
  </TimelineItem>
</Timeline>
```

### 3. レポート (`/reports`)

#### ゲーム別パフォーマンス
```tsx
<Card>
  <CardHeader>
    <CardTitle>ゲーム別リフト効果</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <thead>
        <tr>
          <th>ゲーム</th>
          <th>投稿数</th>
          <th>平均リフト</th>
          <th>総視聴者増加</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Apex Legends</td>
          <td>15回</td>
          <td>+42人</td>
          <td>+630人</td>
        </tr>
        <tr>
          <td>Valorant</td>
          <td>8回</td>
          <td>+35人</td>
          <td>+280人</td>
        </tr>
      </tbody>
    </Table>
  </CardContent>
</Card>
```

---

## 実装ステップ

### Phase 1: 基本機能（Week 1）
- [ ] データベーススキーマ更新
- [ ] EventSub `stream.update` 購読追加
- [ ] ゲーム変更検出ロジック実装
- [ ] Draft作成機能拡張

### Phase 2: 通知システム（Week 2）
- [ ] Web Push通知実装
- [ ] テンプレート変数追加
- [ ] Service Worker更新

### Phase 3: スパム防止（Week 3）
- [ ] クールダウン機能実装
- [ ] ホワイトリスト機能実装
- [ ] 設定UI実装

### Phase 4: 分析機能（Week 4）
- [ ] ゲーム変更履歴表示
- [ ] ゲーム別レポート
- [ ] パフォーマンス分析

---

## テストケース

### 1. 正常系
- [ ] ゲーム変更時に通知が送信される
- [ ] 正しいテンプレート変数が展開される
- [ ] Draft が作成される
- [ ] X投稿が成功する

### 2. 異常系
- [ ] クールダウン中は通知しない
- [ ] ホワイトリスト外のゲームは通知しない
- [ ] 設定で無効化されている場合は通知しない
- [ ] 同じゲームに変更した場合は通知しない

### 3. エッジケース
- [ ] カテゴリが null の場合
- [ ] 配信開始直後のゲーム変更
- [ ] 短時間に複数回変更
- [ ] EventSub遅延時の重複検出

---

## セキュリティ考慮事項

### 1. スパム防止
- クールダウン機能必須
- 1配信あたりの通知上限（例：10回）
- 異常な頻度での変更を検出

### 2. データ検証
- カテゴリ名のサニタイズ
- EventSub署名検証（既存）
- ユーザー権限チェック

---

## パフォーマンス考慮事項

### 1. DB最適化
- `game_change_events` テーブルにインデックス
- 古いレコードの定期削除（90日以上前）

### 2. API呼び出し制限
- Twitch API呼び出しを最小化
- キャッシュ活用

---

## 参考資料

- [Twitch EventSub - stream.update](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#streamupdate)
- [CastCue - 既存の配信開始検出](../architecture/data-flow.md)
- [Web Push通知仕様](../api/internal-api.md#web-push)

---

最終更新: 2025-10-12
作成者: Claude Code
