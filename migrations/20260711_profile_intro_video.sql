ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
  ADD COLUMN IF NOT EXISTS intro_video_updated_at TIMESTAMPTZ;

