BEGIN;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS moderation_note TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_publication_created
  ON events (publication_status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_rejected_note_check'
      AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_rejected_note_check
      CHECK (
        publication_status <> 'rejected'
        OR char_length(trim(COALESCE(moderation_note, ''))) > 0
      ) NOT VALID;
  END IF;
END $$;

COMMIT;
