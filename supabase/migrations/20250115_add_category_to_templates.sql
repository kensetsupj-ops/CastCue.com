-- Add category column to templates table
-- Replace the old 'variant' column with a more flexible 'category' tag system

-- Step 1: Add category column if it doesn't exist
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Step 2: Migrate data from variant to category (if variant exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'variant'
  ) THEN
    -- Migrate existing variant values to category
    UPDATE templates
    SET category = CASE
      WHEN variant = 'A' THEN '熱量'
      WHEN variant = 'B' THEN 'カジュアル'
      ELSE NULL
    END
    WHERE category IS NULL;

    -- Drop the old variant column
    ALTER TABLE templates DROP COLUMN variant;
  END IF;
END $$;

-- Step 3: Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_templates_user_category ON templates(user_id, category);

-- Step 4: Add comment
COMMENT ON COLUMN templates.category IS 'Category tag for template classification (e.g., ランクマ, カジュアル, コラボ)';
