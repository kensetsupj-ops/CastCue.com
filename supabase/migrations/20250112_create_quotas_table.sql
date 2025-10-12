-- Create quotas table for managing user and global quota limits
CREATE TABLE quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  monthly_limit INTEGER NOT NULL DEFAULT 12,
  monthly_used INTEGER NOT NULL DEFAULT 0,
  global_monthly_used INTEGER NOT NULL DEFAULT 0,
  reset_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_quotas_user_id ON quotas(user_id);
CREATE INDEX idx_quotas_reset_on ON quotas(reset_on);

-- Enable RLS
ALTER TABLE quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own quota"
  ON quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all quotas"
  ON quotas FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RPC function for atomic quota consumption
CREATE OR REPLACE FUNCTION consume_quota(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota RECORD;
  v_global_cap INTEGER := 400;
BEGIN
  -- Lock the row for update
  SELECT * INTO v_quota
  FROM quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if quota exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user has enough quota
  IF (v_quota.monthly_limit - v_quota.monthly_used) < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Check if global quota is available
  IF (v_global_cap - v_quota.global_monthly_used) < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Consume quota
  UPDATE quotas
  SET
    monthly_used = monthly_used + p_amount,
    global_monthly_used = global_monthly_used + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the function
COMMENT ON FUNCTION consume_quota IS 'Atomically consume user and global quota. Returns true if successful, false if not enough quota.';
