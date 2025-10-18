-- Add tutorial-related fields to user_settings table
-- Migration: 20250117_add_tutorial_fields.sql
-- Description: Adds fields to track onboarding tutorial progress

-- Add tutorial fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tutorial_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tutorial_skipped_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for tutorial queries
CREATE INDEX IF NOT EXISTS idx_user_settings_tutorial
ON user_settings(tutorial_completed, tutorial_step);

-- Add comment for documentation
COMMENT ON COLUMN user_settings.tutorial_completed IS 'チュートリアル完了フラグ (TRUE = 完了)';
COMMENT ON COLUMN user_settings.tutorial_step IS '現在のステップ番号 (0-5: 0=未開始, 1=X連携, 2=プッシュ通知, 3=テンプレート作成, 4=デフォルト設定, 5=完了)';
COMMENT ON COLUMN user_settings.tutorial_skipped_at IS 'チュートリアルをスキップした日時 (NULL = 未スキップ)';
