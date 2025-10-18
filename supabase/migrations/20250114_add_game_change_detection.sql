-- Game Change Detection Feature Migration
-- Created: 2025-01-14

-- 1. Create draft_type ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_type') THEN
        CREATE TYPE draft_type AS ENUM ('stream_start', 'game_change');
    END IF;
END $$;

-- 2. Extend drafts table
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS draft_type draft_type DEFAULT 'stream_start',
  ADD COLUMN IF NOT EXISTS previous_category VARCHAR(255),
  ADD COLUMN IF NOT EXISTS new_category VARCHAR(255);

-- 3. Extend streams table
ALTER TABLE streams
  ADD COLUMN IF NOT EXISTS current_category VARCHAR(255),
  ADD COLUMN IF NOT EXISTS previous_category VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category_changed_at TIMESTAMPTZ;

-- 4. Create game_change_events table
CREATE TABLE IF NOT EXISTS game_change_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  previous_category VARCHAR(255),
  new_category VARCHAR(255) NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  draft_id UUID REFERENCES drafts(id),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_stream
    FOREIGN KEY (stream_id)
    REFERENCES streams(id)
    ON DELETE CASCADE
);

-- 5. Create indexes for game_change_events
CREATE INDEX IF NOT EXISTS idx_game_change_stream ON game_change_events(stream_id);
CREATE INDEX IF NOT EXISTS idx_game_change_detected ON game_change_events(detected_at DESC);

-- 6. Extend user_settings table
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS notify_game_change BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS game_change_cooldown INTEGER DEFAULT 600, -- seconds
  ADD COLUMN IF NOT EXISTS game_change_whitelist TEXT[]; -- specific games to notify

-- 7. Enable RLS on game_change_events
ALTER TABLE game_change_events ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for game_change_events
CREATE POLICY "Users can view their own game change events"
  ON game_change_events
  FOR SELECT
  USING (
    stream_id IN (
      SELECT id FROM streams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all game change events"
  ON game_change_events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 9. Add comments for documentation
COMMENT ON TABLE game_change_events IS 'Records game/category changes during streams';
COMMENT ON COLUMN drafts.draft_type IS 'Type of draft: stream_start or game_change';
COMMENT ON COLUMN drafts.previous_category IS 'Previous game category (for game_change type)';
COMMENT ON COLUMN drafts.new_category IS 'New game category (for game_change type)';
COMMENT ON COLUMN user_settings.notify_game_change IS 'Enable notifications for game changes';
COMMENT ON COLUMN user_settings.game_change_cooldown IS 'Cooldown period in seconds between game change notifications';
COMMENT ON COLUMN user_settings.game_change_whitelist IS 'Array of game names to notify for (empty = all games)';
