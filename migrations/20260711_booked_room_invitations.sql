BEGIN;

ALTER TABLE wall_posts
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS room_name TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS guest_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS booking_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_reference TEXT;

ALTER TABLE wall_posts
  DROP CONSTRAINT IF EXISTS wall_posts_venue_check,
  DROP CONSTRAINT IF EXISTS wall_posts_guest_capacity_check,
  DROP CONSTRAINT IF EXISTS wall_posts_booked_room_check;

ALTER TABLE wall_posts
  ADD CONSTRAINT wall_posts_venue_check
    CHECK (venue IS NULL OR venue IN ('chatelet', 'pigalle')),
  ADD CONSTRAINT wall_posts_guest_capacity_check
    CHECK (guest_capacity IS NULL OR guest_capacity BETWEEN 1 AND 8),
  ADD CONSTRAINT wall_posts_booked_room_check
    CHECK (
      type <> 'dispo_rideaux_ouverts'
      OR (
        venue IS NOT NULL
        AND starts_at IS NOT NULL
        AND guest_capacity IS NOT NULL
        AND (
          booking_confirmed = FALSE
          OR (
            char_length(trim(COALESCE(room_name, ''))) > 0
            AND char_length(trim(COALESCE(booking_reference, ''))) > 0
          )
        )
      )
    ) NOT VALID;

CREATE TABLE IF NOT EXISTS wall_participation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wall_participation_requests_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  CONSTRAINT wall_participation_requests_message_check
    CHECK (message IS NULL OR char_length(message) <= 300),
  CONSTRAINT wall_participation_requests_unique_member
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wall_participation_requests_post_status
  ON wall_participation_requests (post_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_participation_requests_user_status
  ON wall_participation_requests (user_id, status, created_at DESC);

COMMIT;
