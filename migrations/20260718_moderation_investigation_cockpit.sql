-- LHR moderation investigation cockpit. Additive, idempotent and auditable.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS moderation_investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('paid_solicitation', 'safety', 'harassment', 'fraud', 'other')),
  priority INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'restricted', 'escalated', 'closed')),
  enhanced_access_until TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '6 months'),
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  automation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (subject_user_id)
);

ALTER TABLE moderation_queue
  ADD COLUMN IF NOT EXISTS investigation_id UUID REFERENCES moderation_investigations(id) ON DELETE SET NULL;

INSERT INTO moderation_investigations (subject_user_id, category, priority, opened_at)
SELECT DISTINCT ON (mq.user_id)
  mq.user_id,
  CASE
    WHEN LOWER(COALESCE(mq.reason, '') || ' ' || COALESCE(mq.excerpt, '')) ~ '(prostitut|prestation sexuelle|service sexuel|rémunér|remuner|contre avantage|tarif)' THEN 'paid_solicitation'
    WHEN LOWER(COALESCE(mq.reason, '') || ' ' || COALESCE(mq.excerpt, '')) ~ '(mineur|danger|violence)' THEN 'safety'
    WHEN LOWER(COALESCE(mq.reason, '') || ' ' || COALESCE(mq.excerpt, '')) ~ '(menace|harc[eè]lement)' THEN 'harassment'
    WHEN LOWER(COALESCE(mq.reason, '') || ' ' || COALESCE(mq.excerpt, '')) ~ '(fraude|arnaque|escroquer)' THEN 'fraud'
    ELSE 'other'
  END,
  CASE
    WHEN LOWER(COALESCE(mq.reason, '') || ' ' || COALESCE(mq.excerpt, '')) ~ '(prostitut|prestation sexuelle|service sexuel|rémunér|remuner|contre avantage|tarif)' THEN 100
    WHEN LOWER(COALESCE(mq.reason, '') || ' ' || COALESCE(mq.excerpt, '')) ~ '(mineur|danger|violence)' THEN 80
    WHEN mq.severity = 'critical' THEN 70
    WHEN mq.severity = 'high' THEN 60
    ELSE 10
  END,
  MIN(mq.created_at) OVER (PARTITION BY mq.user_id)
FROM moderation_queue mq
WHERE mq.user_id IS NOT NULL
ORDER BY mq.user_id, mq.created_at ASC
ON CONFLICT (subject_user_id) DO NOTHING;

UPDATE moderation_queue mq
SET investigation_id = mi.id
FROM moderation_investigations mi
WHERE mq.user_id = mi.subject_user_id
  AND mq.investigation_id IS NULL;

CREATE TABLE IF NOT EXISTS moderation_official_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES moderation_investigations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moderation_investigation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES moderation_investigations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moderation_evidence_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES moderation_investigations(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  snapshot JSONB NOT NULL,
  sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moderation_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES moderation_investigations(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL DEFAULT 'internal_review',
  sha256 CHAR(64) NOT NULL,
  manifest JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN moderation_exports.sha256 IS 'SHA-256 fingerprint of the immutable evidence manifest';

CREATE TABLE IF NOT EXISTS moderation_transmissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  export_id UUID NOT NULL REFERENCES moderation_exports(id) ON DELETE RESTRICT,
  investigation_id UUID NOT NULL REFERENCES moderation_investigations(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('lawyer', 'authority', 'other')),
  recipient_name TEXT NOT NULL,
  reference TEXT,
  legal_basis TEXT NOT NULL,
  transmitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE moderation_case_access
  ADD COLUMN IF NOT EXISTS investigation_id UUID REFERENCES moderation_investigations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'case',
  ADD COLUMN IF NOT EXISTS resource_id UUID;

CREATE INDEX IF NOT EXISTS idx_moderation_investigations_priority
  ON moderation_investigations(status, priority DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_investigation
  ON moderation_queue(investigation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_official_messages_investigation
  ON moderation_official_messages(investigation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_investigation
  ON moderation_investigation_events(investigation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_access_investigation
  ON moderation_case_access(investigation_id, accessed_at DESC);
