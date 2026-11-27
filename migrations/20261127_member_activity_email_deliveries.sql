-- Optional member activity alerts are separately auditable and idempotent.
CREATE TABLE IF NOT EXISTS member_activity_email_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('message_alert', 'match_alert', 'event_alert')),
  notification_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, purpose, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_member_activity_email_deliveries_user_created
  ON member_activity_email_deliveries (user_id, created_at DESC);
