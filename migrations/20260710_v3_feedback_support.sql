BEGIN;

CREATE TABLE IF NOT EXISTS community_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_email TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT 'Accueil communauté',
  status TEXT NOT NULL DEFAULT 'open',
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  request_email_reply BOOLEAN NOT NULL DEFAULT FALSE,
  email_reply_sent_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_feedback_kind_check
    CHECK (kind IN ('bug', 'suggestion')),
  CONSTRAINT community_feedback_status_check
    CHECK (status IN ('open', 'in_progress', 'resolved')),
  CONSTRAINT community_feedback_message_length_check
    CHECK (char_length(message) BETWEEN 8 AND 2000),
  CONSTRAINT community_feedback_page_length_check
    CHECK (char_length(page) BETWEEN 1 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_community_feedback_status_created
  ON community_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_feedback_reporter
  ON community_feedback (reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_feedback_conversation
  ON community_feedback (conversation_id);

COMMIT;
