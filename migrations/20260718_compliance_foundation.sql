-- Compliance foundation: additive, idempotent and disabled by application flags.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id BIGSERIAL UNIQUE NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash CHAR(64),
  entry_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_entity
  ON compliance_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_actor
  ON compliance_audit_log(actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS compliance_safety_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  surface TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('block', 'hold')),
  categories TEXT[] NOT NULL,
  rule_ids TEXT[] NOT NULL,
  content_hmac CHAR(64) NOT NULL,
  masked_excerpt TEXT,
  engine_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compliance_safety_actor_created
  ON compliance_safety_events(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_safety_hmac_created
  ON compliance_safety_events(content_hmac, created_at DESC);

ALTER TABLE moderation_case_access
  ADD COLUMN IF NOT EXISTS access_reason TEXT,
  ADD COLUMN IF NOT EXISTS scope_basis TEXT,
  ADD COLUMN IF NOT EXISTS authorized_by UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'moderation_investigations'::regclass
      AND conname = 'moderation_investigations_category_check'
      AND pg_get_constraintdef(oid) NOT LIKE '%external_contact%'
  ) THEN
    ALTER TABLE moderation_investigations
      DROP CONSTRAINT moderation_investigations_category_check;
    ALTER TABLE moderation_investigations
      ADD CONSTRAINT moderation_investigations_category_check
      CHECK (category IN ('paid_solicitation', 'external_contact', 'safety', 'harassment', 'fraud', 'other'));
  END IF;
END
$$;

