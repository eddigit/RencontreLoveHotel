-- Explicit member consent for transactional account-activity emails.

ALTER TABLE email_preferences
  ADD COLUMN IF NOT EXISTS activity_email_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS activity_email_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activity_email_source TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS message_email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS match_email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS event_email_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE email_preferences
  DROP CONSTRAINT IF EXISTS email_preferences_activity_categories_check;

ALTER TABLE email_preferences
  ADD CONSTRAINT email_preferences_activity_categories_check
  CHECK (
    activity_email_consent = TRUE
    OR (
      message_email_enabled = FALSE
      AND match_email_enabled = FALSE
      AND event_email_enabled = FALSE
    )
  );
