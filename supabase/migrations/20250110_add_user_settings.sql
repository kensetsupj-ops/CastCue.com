-- Add user_settings table
-- Date: 2025-10-10

-- Create user_settings table
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
  grace_timer int NOT NULL DEFAULT 90 CHECK (grace_timer >= 30 AND grace_timer <= 300),
  auto_action text NOT NULL DEFAULT 'skip' CHECK (auto_action IN ('post', 'skip')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy (owner-only access)
CREATE POLICY p_user_settings_owner ON user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- Add comment
COMMENT ON TABLE user_settings IS 'User preferences and settings';
COMMENT ON COLUMN user_settings.default_template_id IS 'Default template for quick posting';
COMMENT ON COLUMN user_settings.grace_timer IS 'Grace period in seconds (30-300) before auto action';
COMMENT ON COLUMN user_settings.auto_action IS 'Action to take on timeout (post or skip)';

-- Initialize settings for existing users with default values
INSERT INTO user_settings (user_id, grace_timer, auto_action)
SELECT id, 90, 'skip'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
