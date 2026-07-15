BEGIN;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS booking_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_reference TEXT;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_open_curtains_booking_check;

ALTER TABLE events
  ADD CONSTRAINT events_open_curtains_booking_check
  CHECK (
    experience_type IS DISTINCT FROM 'open_curtains'
    OR booking_confirmed = FALSE
    OR char_length(trim(COALESCE(booking_reference, ''))) > 0
  ) NOT VALID;

ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE event_participants
  DROP CONSTRAINT IF EXISTS event_participants_status_check;

ALTER TABLE event_participants
  ADD CONSTRAINT event_participants_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_event_participants_event_status
  ON event_participants (event_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_participants_user_status
  ON event_participants (user_id, status, created_at DESC);

COMMIT;
