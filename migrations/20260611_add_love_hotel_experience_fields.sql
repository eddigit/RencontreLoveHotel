ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue TEXT CHECK (venue IS NULL OR venue IN ('pigalle', 'chatelet')),
  ADD COLUMN IF NOT EXISTS experience_type TEXT CHECK (
    experience_type IS NULL OR experience_type IN (
      'jacuzzi',
      'spa_couples',
      'open_curtains',
      'love_room',
      'champagne',
      'restaurant',
      'libertine'
    )
  ),
  ADD COLUMN IF NOT EXISTS max_participants INTEGER,
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published'
    CHECK (publication_status IN ('published', 'pending_review', 'rejected')),
  ADD COLUMN IF NOT EXISTS created_by_role TEXT NOT NULL DEFAULT 'member'
    CHECK (created_by_role IN ('hotel', 'admin', 'member'));

CREATE INDEX IF NOT EXISTS idx_events_publication_status ON events(publication_status);
CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue);
CREATE INDEX IF NOT EXISTS idx_events_experience_type ON events(experience_type);
