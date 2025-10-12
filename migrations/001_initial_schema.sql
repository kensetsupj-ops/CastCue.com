-- CastCue Initial Schema
-- このファイルをSupabase SQL Editorで実行してください

-- ENUM型の作成
CREATE TYPE variant AS ENUM ('A', 'B');
CREATE TYPE draft_status AS ENUM ('pending', 'posted', 'skipped');
CREATE TYPE channel_type AS ENUM ('x', 'discord');
CREATE TYPE delivery_status AS ENUM ('queued', 'sent', 'failed', 'skipped');
CREATE TYPE auto_action AS ENUM ('post', 'skip');

-- 1. profiles
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  twitch_user_id TEXT,
  login TEXT,
  profile_image_url TEXT,
  broadcaster_type TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 2. twitch_accounts
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

-- 3. x_connections
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

-- 4. eventsub_subscriptions
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

-- 5. streams
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

-- 6. samples
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

-- 7. templates
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

-- 8. user_settings
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

-- 9. drafts
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

-- 10. deliveries
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

-- 11. links
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

CREATE POLICY "Anyone can read links for redirect"
  ON links FOR SELECT
  USING (true);

-- 12. clicks
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

-- 13. push_subscriptions
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

-- デフォルトテンプレート作成トリガー
CREATE OR REPLACE FUNCTION create_default_templates()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO templates (user_id, name, body, variant) VALUES
    (NEW.id, 'デフォルトテンプレートA', E'【配信開始】{title} をプレイ中！\n{twitch_url}\n\n#Twitch #配信中', 'A'),
    (NEW.id, 'デフォルトテンプレートB', E'🎮 配信スタート！\n\n{title}\n\n👉 {twitch_url}\n\n#Twitch', 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_templates();
