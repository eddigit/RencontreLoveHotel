-- Community wall foundation: member posts, comments, reports and moderation links.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS wall_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wall_posts_type_check
    CHECK (type IN ('profil', 'evenement', 'dispo_rideaux_ouverts')),
  CONSTRAINT wall_posts_body_length_check
    CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT wall_posts_status_check
    CHECK (status IN ('active', 'hidden', 'removed')),
  CONSTRAINT wall_posts_dispo_expiration_check
    CHECK (type <> 'dispo_rideaux_ouverts' OR expires_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS wall_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wall_comments_body_length_check
    CHECK (char_length(body) BETWEEN 1 AND 300),
  CONSTRAINT wall_comments_status_check
    CHECK (status IN ('active', 'hidden', 'removed'))
);

CREATE TABLE IF NOT EXISTS wall_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wall_reports_target_type_check
    CHECK (target_type IN ('post', 'comment')),
  CONSTRAINT wall_reports_unique_reporter_check
    UNIQUE (target_type, target_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_wall_posts_feed
  ON wall_posts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_posts_user_created
  ON wall_posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_posts_event
  ON wall_posts (event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wall_comments_post_created
  ON wall_comments (post_id, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_wall_comments_user_created
  ON wall_comments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_reports_target
  ON wall_reports (target_type, target_id, created_at DESC);

DO $$
BEGIN
  IF to_regclass('moderation_queue') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'moderation_queue_source_type_check'
        AND conrelid = 'moderation_queue'::regclass
    ) THEN
      ALTER TABLE moderation_queue
        DROP CONSTRAINT moderation_queue_source_type_check;
    END IF;

    ALTER TABLE moderation_queue
      ADD CONSTRAINT moderation_queue_source_type_check
      CHECK (source_type IN ('message', 'profile', 'event', 'user', 'wall_post', 'wall_comment'));
  END IF;
END $$;
