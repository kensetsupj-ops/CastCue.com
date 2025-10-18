-- Create stream_events table for storing real-time Twitch events
CREATE TABLE IF NOT EXISTS stream_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'raid', 'follow', 'subscribe', 'cheer', 'game_change', 'title_change', etc.
  event_data JSONB NOT NULL, -- Flexible JSON data for different event types
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Index for faster queries
  INDEX idx_stream_events_stream_id (stream_id),
  INDEX idx_stream_events_occurred_at (occurred_at)
);

-- Add RLS policies
ALTER TABLE stream_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own stream events
CREATE POLICY "Users can view own stream events"
  ON stream_events FOR SELECT
  USING (auth.uid() = user_id);

-- Create stream_analytics table for aggregated statistics
CREATE TABLE IF NOT EXISTS stream_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Viewer statistics
  peak_viewers INTEGER DEFAULT 0,
  peak_viewers_at TIMESTAMP WITH TIME ZONE,
  average_viewers INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  total_view_time INTEGER DEFAULT 0, -- in minutes

  -- Engagement metrics
  new_followers INTEGER DEFAULT 0,
  new_subscribers INTEGER DEFAULT 0,
  total_raids INTEGER DEFAULT 0,
  total_raid_viewers INTEGER DEFAULT 0,
  bits_cheered INTEGER DEFAULT 0,
  chat_messages INTEGER DEFAULT 0,

  -- Platform metrics
  clips_created INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint to ensure one record per stream
  UNIQUE(stream_id)
);

-- Add RLS policies
ALTER TABLE stream_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view their own analytics
CREATE POLICY "Users can view own stream analytics"
  ON stream_analytics FOR SELECT
  USING (auth.uid() = user_id);

-- Add columns to streams table for real Twitch data
ALTER TABLE streams ADD COLUMN IF NOT EXISTS game_id VARCHAR(50);
ALTER TABLE streams ADD COLUMN IF NOT EXISTS game_name VARCHAR(255);
ALTER TABLE streams ADD COLUMN IF NOT EXISTS language VARCHAR(10);
ALTER TABLE streams ADD COLUMN IF NOT EXISTS is_mature BOOLEAN DEFAULT false;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE streams ADD COLUMN IF NOT EXISTS viewer_count INTEGER; -- Current viewer count at stream start

-- Add columns for Twitch user data
ALTER TABLE twitch_accounts ADD COLUMN IF NOT EXISTS broadcaster_type VARCHAR(50);
ALTER TABLE twitch_accounts ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE twitch_accounts ADD COLUMN IF NOT EXISTS offline_image_url TEXT;
ALTER TABLE twitch_accounts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE twitch_accounts ADD COLUMN IF NOT EXISTS view_count INTEGER; -- Total channel views
ALTER TABLE twitch_accounts ADD COLUMN IF NOT EXISTS created_at_twitch TIMESTAMP WITH TIME ZONE;

-- Function to update stream_analytics when events occur
CREATE OR REPLACE FUNCTION update_stream_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update analytics based on event type
  IF NEW.event_type = 'follow' THEN
    INSERT INTO stream_analytics (stream_id, user_id, new_followers)
    VALUES (NEW.stream_id, NEW.user_id, 1)
    ON CONFLICT (stream_id)
    DO UPDATE SET
      new_followers = stream_analytics.new_followers + 1,
      updated_at = CURRENT_TIMESTAMP;

  ELSIF NEW.event_type = 'subscribe' THEN
    INSERT INTO stream_analytics (stream_id, user_id, new_subscribers)
    VALUES (NEW.stream_id, NEW.user_id, 1)
    ON CONFLICT (stream_id)
    DO UPDATE SET
      new_subscribers = stream_analytics.new_subscribers + 1,
      updated_at = CURRENT_TIMESTAMP;

  ELSIF NEW.event_type = 'raid' THEN
    INSERT INTO stream_analytics (stream_id, user_id, total_raids, total_raid_viewers)
    VALUES (NEW.stream_id, NEW.user_id, 1, (NEW.event_data->>'viewers')::INTEGER)
    ON CONFLICT (stream_id)
    DO UPDATE SET
      total_raids = stream_analytics.total_raids + 1,
      total_raid_viewers = stream_analytics.total_raid_viewers + (NEW.event_data->>'viewers')::INTEGER,
      updated_at = CURRENT_TIMESTAMP;

  ELSIF NEW.event_type = 'cheer' THEN
    INSERT INTO stream_analytics (stream_id, user_id, bits_cheered)
    VALUES (NEW.stream_id, NEW.user_id, (NEW.event_data->>'bits')::INTEGER)
    ON CONFLICT (stream_id)
    DO UPDATE SET
      bits_cheered = stream_analytics.bits_cheered + (NEW.event_data->>'bits')::INTEGER,
      updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update analytics
CREATE TRIGGER update_analytics_on_event
  AFTER INSERT ON stream_events
  FOR EACH ROW
  EXECUTE FUNCTION update_stream_analytics();

-- Function to update peak viewers from stream_samples
CREATE OR REPLACE FUNCTION update_peak_viewers()
RETURNS TRIGGER AS $$
BEGIN
  -- Update peak viewers if new sample is higher
  INSERT INTO stream_analytics (stream_id, user_id, peak_viewers, peak_viewers_at)
  VALUES (
    NEW.stream_id,
    (SELECT user_id FROM streams WHERE id = NEW.stream_id),
    NEW.viewer_count,
    NEW.sampled_at
  )
  ON CONFLICT (stream_id)
  DO UPDATE SET
    peak_viewers = GREATEST(stream_analytics.peak_viewers, NEW.viewer_count),
    peak_viewers_at = CASE
      WHEN NEW.viewer_count > stream_analytics.peak_viewers
      THEN NEW.sampled_at
      ELSE stream_analytics.peak_viewers_at
    END,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update peak viewers
CREATE TRIGGER update_peak_on_sample
  AFTER INSERT ON stream_samples
  FOR EACH ROW
  EXECUTE FUNCTION update_peak_viewers();