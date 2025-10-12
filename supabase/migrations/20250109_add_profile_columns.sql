-- Add Twitch profile columns to profiles table
-- Date: 2025-10-09

-- Add columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS twitch_user_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS login text,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS broadcaster_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS email text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_twitch_user_id_idx ON profiles(twitch_user_id);
CREATE INDEX IF NOT EXISTS profiles_login_idx ON profiles(login);

-- Add comment
COMMENT ON COLUMN profiles.twitch_user_id IS 'Twitch user ID from Helix API';
COMMENT ON COLUMN profiles.login IS 'Twitch login name';
COMMENT ON COLUMN profiles.profile_image_url IS 'Twitch profile image URL';
COMMENT ON COLUMN profiles.broadcaster_type IS 'Twitch broadcaster type (partner, affiliate, or none)';
COMMENT ON COLUMN profiles.email IS 'User email address';
