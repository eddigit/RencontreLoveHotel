CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_blocks_distinct_users CHECK (blocker_id <> blocked_id),
  CONSTRAINT user_blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
  ON user_blocks (blocker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON user_blocks (blocked_id, created_at DESC);

CREATE TABLE IF NOT EXISTS profile_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT profile_reports_distinct_users CHECK (reporter_id <> reported_user_id),
  CONSTRAINT profile_reports_reason_check CHECK (
    reason IN (
      'harassment',
      'fake_profile',
      'inappropriate_content',
      'spam',
      'dangerous_behavior',
      'community_rules',
      'other'
    )
  ),
  CONSTRAINT profile_reports_status_check
    CHECK (status IN ('new', 'in_review', 'dismissed', 'actioned')),
  CONSTRAINT profile_reports_unique_pair UNIQUE (reporter_id, reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_reports_status_created
  ON profile_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_reports_reported
  ON profile_reports (reported_user_id, created_at DESC);
