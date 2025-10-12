-- ============================================================
-- CastCue Complete Database Migration
-- This file contains all migrations in sequential order
-- Execute this in Supabase Dashboard SQL Editor
-- ============================================================

-- ============================================================
-- Migration 1: Initial Schema (20250109)
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create custom types
CREATE TYPE channel_type AS ENUM ('x','discord');
CREATE TYPE delivery_status AS ENUM ('queued','sent','failed','skipped');

-- 2. Core tables

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- twitch_accounts table
CREATE TABLE IF NOT EXISTS twitch_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcaster_id text NOT NULL UNIQUE,
  login text NOT NULL,
  display_name text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- x_connections table (OAuth tokens encrypted)
CREATE TABLE IF NOT EXISTS x_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text[] NOT NULL,
  access_token_cipher text NOT NULL,
  refresh_token_cipher text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- discord_webhooks table
CREATE TABLE IF NOT EXISTS discord_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- eventsub_subscriptions table
CREATE TABLE IF NOT EXISTS eventsub_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_subscription_id text NOT NULL UNIQUE,
  type text NOT NULL,
  status text NOT NULL,
  revocation_reason text,
  created_at timestamptz DEFAULT now()
);

-- streams table
CREATE TABLE IF NOT EXISTS streams (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'twitch',
  stream_id text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at_est timestamptz,
  peak int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stream_id)
);

-- samples table (viewer count sampling)
CREATE TABLE IF NOT EXISTS samples (
  id bigserial PRIMARY KEY,
  stream_id bigint NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  taken_at timestamptz NOT NULL,
  viewer_count int NOT NULL
);

CREATE INDEX IF NOT EXISTS samples_stream_id_idx ON samples(stream_id);
CREATE INDEX IF NOT EXISTS samples_taken_at_idx ON samples(taken_at);

-- templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text NOT NULL,
  variant text CHECK (variant IN ('A','B')) DEFAULT 'A',
  created_at timestamptz DEFAULT now()
);

-- deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id bigint REFERENCES streams(id) ON DELETE SET NULL,
  channel channel_type NOT NULL,
  status delivery_status NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  post_id text,
  error text,
  latency_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliveries_user_id_idx ON deliveries(user_id);
CREATE INDEX IF NOT EXISTS deliveries_stream_id_idx ON deliveries(stream_id);
CREATE INDEX IF NOT EXISTS deliveries_created_at_idx ON deliveries(created_at);

-- links table (short URLs)
CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  short_code text NOT NULL UNIQUE,
  target_url text NOT NULL,
  campaign_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS links_short_code_idx ON links(short_code);

-- clicks table
CREATE TABLE IF NOT EXISTS clicks (
  id bigserial PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  ua text,
  referrer text
);

CREATE INDEX IF NOT EXISTS clicks_link_id_idx ON clicks(link_id);
CREATE INDEX IF NOT EXISTS clicks_at_idx ON clicks(at);

-- quotas table
CREATE TABLE IF NOT EXISTS quotas (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_limit int NOT NULL DEFAULT 12,
  monthly_used int NOT NULL DEFAULT 0,
  global_monthly_used int NOT NULL DEFAULT 0,
  reset_on date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotas_user_id ON quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_quotas_reset_on ON quotas(reset_on);

-- push_subscriptions table (Web Push)
CREATE TABLE IF NOT EXISTS push_subscriptions(
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  keys jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- drafts table (review approval mode)
CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id bigint REFERENCES streams(id) ON DELETE SET NULL,
  title text NOT NULL,
  twitch_url text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drafts_user_id_idx ON drafts(user_id);
CREATE INDEX IF NOT EXISTS drafts_status_idx ON drafts(status);

-- 3. Row Level Security (RLS)

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitch_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventsub_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- Create policies (owner-only access)
CREATE POLICY IF NOT EXISTS p_profiles_owner ON profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_twitch_accounts_owner ON twitch_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_x_connections_owner ON x_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_discord_webhooks_owner ON discord_webhooks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_eventsub_subscriptions_owner ON eventsub_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_streams_owner ON streams
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_samples_owner ON samples
  FOR ALL USING (auth.uid() = (SELECT user_id FROM streams WHERE id = stream_id));

CREATE POLICY IF NOT EXISTS p_templates_owner ON templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_deliveries_owner ON deliveries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_links_owner ON links
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_clicks_owner ON clicks
  FOR ALL USING (auth.uid() = (SELECT user_id FROM links WHERE id = link_id));

CREATE POLICY IF NOT EXISTS "Users can view own quota" ON quotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage all quotas" ON quotas
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS p_push_subscriptions_owner ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS p_drafts_owner ON drafts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Views

-- Lift calculation view
CREATE OR REPLACE VIEW v_lift AS
SELECT
  d.id AS delivery_id,
  d.user_id,
  s.id AS stream_id,
  d.created_at AS delivery_at,
  (SELECT avg(viewer_count)::int
   FROM samples
   WHERE stream_id = s.id
     AND taken_at BETWEEN d.created_at - interval '5 min' AND d.created_at
  ) AS baseline,
  (SELECT viewer_count
   FROM samples
   WHERE stream_id = s.id
     AND taken_at >= d.created_at + interval '10 min'
   ORDER BY taken_at ASC
   LIMIT 1
  ) AS after10,
  coalesce(
    (SELECT viewer_count FROM samples WHERE stream_id = s.id AND taken_at >= d.created_at + interval '10 min' ORDER BY taken_at ASC LIMIT 1),
    0
  ) - coalesce(
    (SELECT avg(viewer_count)::int FROM samples WHERE stream_id = s.id AND taken_at BETWEEN d.created_at - interval '5 min' AND d.created_at),
    0
  ) AS lift
FROM deliveries d
LEFT JOIN streams s ON s.id = d.stream_id
WHERE d.status = 'sent';

-- Enable security invoker on view
ALTER VIEW v_lift SET (security_invoker = on);

-- 5. Functions

-- Function to initialize user quota
CREATE OR REPLACE FUNCTION init_user_quota(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO quotas (user_id, reset_on)
  VALUES (
    p_user_id,
    date_trunc('month', now() + interval '1 month')::date
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume quota (with atomic locking)
CREATE OR REPLACE FUNCTION consume_quota(p_user_id UUID, p_amount INTEGER DEFAULT 1)
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

-- ============================================================
-- Migration 2: Add Profile Columns (20250109)
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS twitch_user_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS login text,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS broadcaster_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS profiles_twitch_user_id_idx ON profiles(twitch_user_id);
CREATE INDEX IF NOT EXISTS profiles_login_idx ON profiles(login);

-- ============================================================
-- Migration 3: Add User Settings (20250110)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
  grace_timer int NOT NULL DEFAULT 90 CHECK (grace_timer >= 30 AND grace_timer <= 300),
  auto_action text NOT NULL DEFAULT 'skip' CHECK (auto_action IN ('post', 'skip')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS p_user_settings_owner ON user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- Initialize settings for existing users
INSERT INTO user_settings (user_id, grace_timer, auto_action)
SELECT id, 90, 'skip'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- Migration 4: Default Templates Trigger (20250111)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.email, NEW.raw_user_meta_data->>'display_name'));

  -- Initialize quota
  INSERT INTO quotas (user_id, reset_on)
  VALUES (
    NEW.id,
    date_trunc('month', now() + interval '1 month')::date
  );

  -- Create default templates A and B
  INSERT INTO templates (user_id, name, body, variant) VALUES
    (NEW.id, 'デフォルトテンプレートA', E'【配信開始】{title} をプレイ中！\n{twitch_url}\n\n#Twitch #配信中', 'A'),
    (NEW.id, 'デフォルトテンプレートB', E'🎮 配信スタート！\n\n{title}\n\n👉 {twitch_url}\n\n#Twitch', 'B');

  -- Create user settings with default template A
  INSERT INTO user_settings (user_id, default_template_id, grace_timer, auto_action)
  SELECT
    NEW.id,
    t.id,
    90,
    'skip'
  FROM templates t
  WHERE t.user_id = NEW.id AND t.variant = 'A'
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Migration 5: Add Template ID to Deliveries (20250113)
-- ============================================================

ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_template_id ON deliveries(template_id);

-- ============================================================
-- 6. Comments for documentation
-- ============================================================

COMMENT ON TABLE profiles IS 'User profile information';
COMMENT ON TABLE twitch_accounts IS 'Connected Twitch broadcaster accounts';
COMMENT ON TABLE x_connections IS 'X (Twitter) OAuth connections with encrypted tokens';
COMMENT ON TABLE discord_webhooks IS 'Discord webhook URLs for notifications';
COMMENT ON TABLE eventsub_subscriptions IS 'Twitch EventSub subscription tracking';
COMMENT ON TABLE streams IS 'Recorded live streams';
COMMENT ON TABLE samples IS '1-minute interval viewer count samples';
COMMENT ON TABLE templates IS 'Notification message templates with A/B variants';
COMMENT ON TABLE deliveries IS 'Notification delivery records';
COMMENT ON TABLE links IS 'Short URL links for click tracking';
COMMENT ON TABLE clicks IS 'Click event logs';
COMMENT ON TABLE quotas IS 'Monthly X post quota management';
COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions';
COMMENT ON TABLE drafts IS 'Pending notification drafts for review approval';
COMMENT ON TABLE user_settings IS 'User preferences and settings';

COMMENT ON COLUMN profiles.twitch_user_id IS 'Twitch user ID from Helix API';
COMMENT ON COLUMN profiles.login IS 'Twitch login name';
COMMENT ON COLUMN profiles.profile_image_url IS 'Twitch profile image URL';
COMMENT ON COLUMN profiles.broadcaster_type IS 'Twitch broadcaster type (partner, affiliate, or none)';
COMMENT ON COLUMN profiles.email IS 'User email address';
COMMENT ON COLUMN user_settings.default_template_id IS 'Default template for quick posting';
COMMENT ON COLUMN user_settings.grace_timer IS 'Grace period in seconds (30-300) before auto action';
COMMENT ON COLUMN user_settings.auto_action IS 'Action to take on timeout (post or skip)';
COMMENT ON COLUMN deliveries.template_id IS 'Template used for this delivery (for A/B testing analysis)';
COMMENT ON FUNCTION consume_quota IS 'Atomically consume user and global quota. Returns true if successful, false if not enough quota.';
COMMENT ON FUNCTION handle_new_user() IS 'Creates profile, quota, default templates (A/B), and user settings for new users';

-- ============================================================
-- Migration Complete!
-- ============================================================
