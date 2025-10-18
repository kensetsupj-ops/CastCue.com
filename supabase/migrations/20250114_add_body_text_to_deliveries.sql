-- Add body_text column to deliveries table to store actual post content
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS body_text TEXT;

-- Add comment for documentation
COMMENT ON COLUMN deliveries.body_text IS 'The actual text content that was posted to the social media platform';

-- Update existing records with placeholder (optional)
-- This is just for display purposes in reports
UPDATE deliveries
SET body_text = '投稿内容（履歴データ）'
WHERE body_text IS NULL;