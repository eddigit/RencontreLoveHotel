-- LHR anti-solicitation compliance foundation. Additive and idempotent.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT legal_acceptances_document_check
    CHECK (document_type IN ('terms', 'privacy', 'anti_solicitation')),
  CONSTRAINT legal_acceptances_unique_version
    UNIQUE (user_id, document_type, document_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user
  ON legal_acceptances(user_id, accepted_at DESC);

CREATE TABLE IF NOT EXISTS moderation_policy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_version TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  activated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE moderation_keywords
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS phrase BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE moderation_queue
  ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT 'warn',
  ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS subject_pseudonym TEXT,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS messaging_restricted_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS moderation_case_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES moderation_queue(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'community_moderator')),
  purpose TEXT NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moderation_case_access_case
  ON moderation_case_access(case_id, accessed_at DESC);

CREATE TABLE IF NOT EXISTS moderation_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES moderation_queue(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('no_action', 'reminder', 'warning', 'message_restriction', 'suspension', 'permanent_ban', 'legal_escalation')),
  reason TEXT NOT NULL,
  statement_of_reasons TEXT NOT NULL,
  automation_contributed BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moderation_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES moderation_queue(id) ON DELETE CASCADE,
  appellant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'upheld', 'reversed')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO moderation_policy_versions (policy_version, active)
VALUES ('anti-solicitation-2026-07-15', FALSE)
ON CONFLICT (policy_version) DO NOTHING;

INSERT INTO moderation_keywords (keyword, severity, action, active, category, weight, phrase, policy_version)
VALUES
  ('tarif', 'low', 'flag', FALSE, 'price', 1, FALSE, 'anti-solicitation-2026-07-15'),
  ('prix', 'low', 'flag', FALSE, 'price', 1, FALSE, 'anti-solicitation-2026-07-15'),
  ('cadeau', 'low', 'flag', FALSE, 'benefit', 1, FALSE, 'anti-solicitation-2026-07-15'),
  ('cash', 'medium', 'flag', FALSE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('paypal', 'medium', 'flag', FALSE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('contre rémunération', 'high', 'escalate', FALSE, 'exchange', 5, TRUE, 'anti-solicitation-2026-07-15'),
  ('service sexuel', 'critical', 'escalate', FALSE, 'sexual_service', 6, TRUE, 'anti-solicitation-2026-07-15'),
  ('prestation sexuelle', 'critical', 'escalate', FALSE, 'sexual_service', 6, TRUE, 'anti-solicitation-2026-07-15')
ON CONFLICT (keyword) DO UPDATE SET
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  phrase = EXCLUDED.phrase,
  policy_version = EXCLUDED.policy_version;

COMMENT ON COLUMN users.role IS 'Application roles include user, community_moderator and admin.';
