CREATE TABLE IF NOT EXISTS private_photo_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  identity_kind TEXT NOT NULL CHECK (identity_kind IN ('solo', 'couple')),
  pseudonym_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed', 'expired')),
  evidence_image BYTEA, evidence_mime_type TEXT, evidence_bytes INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
  decided_at TIMESTAMPTZ, decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_note TEXT, evidence_purged_at TIMESTAMPTZ,
  CONSTRAINT private_photo_verification_evidence_shape CHECK ((status = 'pending' AND evidence_image IS NOT NULL AND evidence_mime_type = 'image/webp' AND evidence_bytes > 0 AND evidence_bytes <= 2097152) OR (status <> 'pending' AND evidence_image IS NULL AND evidence_mime_type IS NULL AND evidence_bytes IS NULL AND evidence_purged_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS private_photo_verifications_one_pending ON private_photo_verification_requests (user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS private_photo_verifications_one_active ON private_photo_verification_requests (user_id) WHERE status IN ('pending', 'approved');
CREATE INDEX IF NOT EXISTS private_photo_verifications_admin_queue ON private_photo_verification_requests (status, submitted_at ASC);
CREATE INDEX IF NOT EXISTS private_photo_verifications_public_badge ON private_photo_verification_requests (user_id) WHERE status = 'approved';
