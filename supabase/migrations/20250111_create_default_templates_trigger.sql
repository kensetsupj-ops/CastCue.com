-- Create default templates trigger
-- Date: 2025-01-11
-- Purpose: Automatically create default templates and user settings for new users

-- Update handle_new_user function to create default templates and settings
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

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS 'Creates profile, quota, default templates (A/B), and user settings for new users';
