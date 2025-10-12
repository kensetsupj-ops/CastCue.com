# データベーススキーマ定義

Supabase (PostgreSQL) のテーブル定義とリレーション。

## テーブル一覧

1. **profiles** - ユーザープロフィール
2. **twitch_accounts** - Twitch連携情報
3. **x_connections** - X (Twitter) 連携情報
4. **eventsub_subscriptions** - Twitch EventSub購読
5. **streams** - 配信記録
6. **samples** - 視聴者数サンプル
7. **templates** - 投稿テンプレート
8. **user_settings** - ユーザー設定
9. **drafts** - 投稿下書き
10. **deliveries** - 投稿配信記録
11. **links** - 短縮リンク
12. **clicks** - クリック記録
13. **push_subscriptions** - Web Push購読
14. **quotas** - クォータ管理

## SQL定義

### 1. profiles
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);
```

### 2. twitch_accounts
```sql
CREATE TABLE twitch_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  broadcaster_id TEXT NOT NULL UNIQUE,
  login TEXT NOT NULL,
  display_name TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_twitch_accounts_user_id ON twitch_accounts(user_id);
CREATE INDEX idx_twitch_accounts_broadcaster_id ON twitch_accounts(broadcaster_id);

ALTER TABLE twitch_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own twitch accounts"
  ON twitch_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own twitch accounts"
  ON twitch_accounts FOR ALL
  USING (auth.uid() = user_id);
```

### 3. x_connections
```sql
CREATE TABLE x_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  scope TEXT[] NOT NULL,
  access_token_cipher TEXT NOT NULL,
  refresh_token_cipher TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_x_connections_user_id ON x_connections(user_id);

ALTER TABLE x_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own x connections"
  ON x_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all x connections"
  ON x_connections FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 4. eventsub_subscriptions
```sql
CREATE TABLE eventsub_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  twitch_subscription_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eventsub_user_id ON eventsub_subscriptions(user_id);
CREATE INDEX idx_eventsub_twitch_sub_id ON eventsub_subscriptions(twitch_subscription_id);

ALTER TABLE eventsub_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON eventsub_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
```

### 5. streams
```sql
CREATE TABLE streams (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'twitch',
  stream_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at_est TIMESTAMPTZ,
  peak INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_streams_user_id ON streams(user_id);
CREATE INDEX idx_streams_started_at ON streams(started_at DESC);
CREATE INDEX idx_streams_ended_at ON streams(ended_at_est) WHERE ended_at_est IS NULL;
CREATE UNIQUE INDEX idx_streams_stream_id ON streams(stream_id);

ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streams"
  ON streams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage streams"
  ON streams FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 6. samples
```sql
CREATE TABLE samples (
  id BIGSERIAL PRIMARY KEY,
  stream_id BIGINT NOT NULL REFERENCES streams ON DELETE CASCADE,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  viewer_count INTEGER NOT NULL
);

CREATE INDEX idx_samples_stream_id ON samples(stream_id);
CREATE INDEX idx_samples_taken_at ON samples(taken_at);

ALTER TABLE samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view samples of own streams"
  ON samples FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM streams
      WHERE streams.id = samples.stream_id
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage samples"
  ON samples FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 7. templates
```sql
CREATE TYPE variant AS ENUM ('A', 'B');

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  variant variant NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_variant ON templates(user_id, variant);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON templates FOR ALL
  USING (auth.uid() = user_id);
```

### 8. user_settings
```sql
CREATE TYPE auto_action AS ENUM ('post', 'skip');

CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  default_template_id UUID REFERENCES templates ON DELETE SET NULL,
  grace_timer INTEGER NOT NULL DEFAULT 90 CHECK (grace_timer >= 30 AND grace_timer <= 300),
  auto_action auto_action NOT NULL DEFAULT 'skip',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_default_template ON user_settings(default_template_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all settings"
  ON user_settings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 9. drafts
```sql
CREATE TYPE draft_status AS ENUM ('pending', 'posted', 'skipped');

CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  stream_id BIGINT REFERENCES streams ON DELETE CASCADE,
  title TEXT NOT NULL,
  twitch_url TEXT NOT NULL,
  image_url TEXT,
  status draft_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drafts_user_id ON drafts(user_id);
CREATE INDEX idx_drafts_status ON drafts(status);
CREATE INDEX idx_drafts_created_at ON drafts(created_at DESC);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage drafts"
  ON drafts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 9. deliveries
```sql
CREATE TYPE channel_type AS ENUM ('x', 'discord');
CREATE TYPE delivery_status AS ENUM ('queued', 'sent', 'failed', 'skipped');

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  stream_id BIGINT REFERENCES streams ON DELETE CASCADE,
  channel channel_type NOT NULL,
  status delivery_status NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  post_id TEXT,
  error TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_user_id ON deliveries(user_id);
CREATE INDEX idx_deliveries_stream_id ON deliveries(stream_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_idempotency ON deliveries(idempotency_key);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deliveries"
  ON deliveries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage deliveries"
  ON deliveries FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 10. links
```sql
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  short_code TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  campaign_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_short_code ON links(short_code);
CREATE INDEX idx_links_campaign ON links(campaign_id);

ALTER TABLE links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links"
  ON links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage links"
  ON links FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 短縮リンクリダイレクトは認証不要（public access）
CREATE POLICY "Anyone can read links for redirect"
  ON links FOR SELECT
  USING (true);
```

### 11. clicks
```sql
CREATE TABLE clicks (
  id BIGSERIAL PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES links ON DELETE CASCADE,
  at TIMESTAMPTZ DEFAULT NOW(),
  ua TEXT,
  referrer TEXT
);

CREATE INDEX idx_clicks_link_id ON clicks(link_id);
CREATE INDEX idx_clicks_at ON clicks(at DESC);

ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clicks on own links"
  ON clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM links
      WHERE links.id = clicks.link_id
      AND links.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage clicks"
  ON clicks FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 12. push_subscriptions
```sql
CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_endpoint ON push_subscriptions(endpoint);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 13. quotas
```sql
CREATE TABLE quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  monthly_limit INTEGER NOT NULL DEFAULT 12,
  monthly_used INTEGER NOT NULL DEFAULT 0,
  global_monthly_used INTEGER NOT NULL DEFAULT 0,
  reset_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotas_user_id ON quotas(user_id);
CREATE INDEX idx_quotas_reset_on ON quotas(reset_on);

ALTER TABLE quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quota"
  ON quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all quotas"
  ON quotas FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RPC function for atomic quota consumption
CREATE OR REPLACE FUNCTION consume_quota(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota RECORD;
  v_global_cap INTEGER := 400;
BEGIN
  -- Lock the row for update
  SELECT * INTO v_quota
  FROM quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if quota exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user has enough quota
  IF (v_quota.monthly_limit - v_quota.monthly_used) < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Check if global quota is available
  IF (v_global_cap - v_quota.global_monthly_used) < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Consume quota
  UPDATE quotas
  SET
    monthly_used = monthly_used + p_amount,
    global_monthly_used = global_monthly_used + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## リレーション図

```
auth.users (Supabase Auth)
    ├─ profiles (1:1)
    ├─ twitch_accounts (1:N)
    ├─ x_connections (1:1)
    ├─ eventsub_subscriptions (1:N)
    ├─ streams (1:N)
    │   └─ samples (1:N)
    ├─ templates (1:N)
    │   └─ user_settings (1:1, FK: default_template_id)
    ├─ user_settings (1:1)
    ├─ drafts (1:N)
    ├─ deliveries (1:N)
    ├─ links (1:N)
    │   └─ clicks (1:N)
    ├─ push_subscriptions (1:N)
    └─ quotas (1:1)
```

## データ型説明

### ENUM型
```sql
-- variant: テンプレートバリアント（A/Bテスト用）
variant: 'A' | 'B'

-- auto_action: タイムアウト時の自動処理動作
auto_action: 'post' | 'skip'

-- draft_status: 下書きステータス
draft_status: 'pending' | 'posted' | 'skipped'

-- channel_type: 投稿先チャンネル
channel_type: 'x' | 'discord'

-- delivery_status: 配信ステータス
delivery_status: 'queued' | 'sent' | 'failed' | 'skipped'
```

### JSONB型
```sql
-- push_subscriptions.keys
{
  "p256dh": "base64-encoded-key",
  "auth": "base64-encoded-key"
}

-- x_connections.scope (TEXT[])
['tweet.write', 'tweet.read', 'users.read', 'offline.access']
```

## インデックス戦略

### パフォーマンス最適化
```sql
-- よく検索されるカラム
CREATE INDEX idx_streams_user_id ON streams(user_id);
CREATE INDEX idx_samples_stream_id ON samples(stream_id);

-- 日付範囲検索
CREATE INDEX idx_streams_started_at ON streams(started_at DESC);
CREATE INDEX idx_clicks_at ON clicks(at DESC);

-- アクティブ配信検索
CREATE INDEX idx_streams_ended_at ON streams(ended_at_est)
  WHERE ended_at_est IS NULL;

-- 一意性制約
CREATE UNIQUE INDEX idx_streams_stream_id ON streams(stream_id);
CREATE UNIQUE INDEX idx_links_short_code ON links(short_code);
```

## マイグレーション手順

### 初回セットアップ
```sql
-- 1. すべてのテーブルを作成（上記のSQL順に実行）

-- 2. デフォルトテンプレート作成関数
CREATE OR REPLACE FUNCTION create_default_templates()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO templates (user_id, name, body, variant) VALUES
    (NEW.id, 'デフォルトテンプレートA', E'【配信開始】{title} をプレイ中！\n{twitch_url}\n\n#Twitch #配信中', 'A'),
    (NEW.id, 'デフォルトテンプレートB', E'🎮 配信スタート！\n\n{title}\n\n👉 {twitch_url}\n\n#Twitch', 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. トリガー作成（新規ユーザー登録時にテンプレート作成）
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_templates();
```

### データクリーンアップ（定期実行推奨）
```sql
-- 30日以上前の skipped/posted drafts を削除
DELETE FROM drafts
WHERE status IN ('skipped', 'posted')
AND created_at < NOW() - INTERVAL '30 days';

-- 無効なpush subscriptionsを削除（手動実行）
-- 実際の削除は lib/push.ts で自動実行される
```

## バックアップとリストア

### Supabase UI
```
Project Settings → Database → Database Backups
- 自動バックアップ: 毎日
- 保持期間: 7日間（Free tier）、30日間（Pro tier）
```

### CLIバックアップ
```bash
# エクスポート
supabase db dump -f backup.sql

# リストア
psql -h db.xxxxx.supabase.co -U postgres -d postgres -f backup.sql
```

## パフォーマンス監視

### スロークエリ確認
```sql
-- pg_stat_statements拡張を有効化
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- スロークエリTOP10
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

次のステップ: [RLSポリシー](./rls-policies.md)でセキュリティ設定を確認
