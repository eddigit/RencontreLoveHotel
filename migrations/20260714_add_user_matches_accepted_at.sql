ALTER TABLE user_matches
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

UPDATE user_matches
SET accepted_at = COALESCE(accepted_at, updated_at, created_at)
WHERE status = 'accepted'
  AND accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_matches_accepted_at
  ON user_matches (accepted_at)
  WHERE status = 'accepted';
