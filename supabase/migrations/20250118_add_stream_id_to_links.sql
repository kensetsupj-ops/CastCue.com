-- Add stream_id to links table for OGP metadata generation
-- This allows short URLs to display proper Twitch channel icons and titles on X/Twitter

ALTER TABLE links
ADD COLUMN IF NOT EXISTS stream_id BIGINT REFERENCES streams(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS links_stream_id_idx ON links(stream_id);

-- Add comment
COMMENT ON COLUMN links.stream_id IS 'Reference to the stream associated with this short link (for OGP metadata)';
