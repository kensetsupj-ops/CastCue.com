-- Add has_media flag to links table
-- Controls whether to show OGP preview or not
-- If has_media = true, skip OGP (image attachment takes priority)
-- If has_media = false, show OGP (channel icon as fallback)

ALTER TABLE links
ADD COLUMN IF NOT EXISTS has_media BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN links.has_media IS 'Whether the post has media attached (if true, skip OGP to avoid conflict)';
