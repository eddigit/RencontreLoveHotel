ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_time TIME NOT NULL DEFAULT '20:00:00';

UPDATE events
SET event_time = '20:00:00'
WHERE event_time IS NULL;
