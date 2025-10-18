-- Add thumbnail_url column to streams table
-- This stores the Twitch stream thumbnail URL for display in stream list

ALTER TABLE streams ADD COLUMN thumbnail_url TEXT;

COMMENT ON COLUMN streams.thumbnail_url IS 'Twitch stream thumbnail URL (1920x1080)';
