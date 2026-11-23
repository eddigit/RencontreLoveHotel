-- Aggregate-only pilot measurement. No member, profile, referrer, or destination data is recorded.
CREATE TABLE IF NOT EXISTS joug_pilot_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS joug_pilot_daily_clicks (
  day DATE PRIMARY KEY,
  click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0)
);
