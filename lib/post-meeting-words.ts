import { sql } from '@/lib/db'
let schemaPromise: Promise<void> | undefined
export function ensurePostMeetingWordsSchema() {
  if (!schemaPromise)
    schemaPromise = (async () => {
      await sql.query(
        `CREATE TABLE IF NOT EXISTS post_meeting_words (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, author_pseudonym_snapshot TEXT NOT NULL, recipient_pseudonym_snapshot TEXT NOT NULL, message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 1000), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')), author_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, author_publication_consent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, recipient_confirmed_at TIMESTAMPTZ, recipient_publication_consent_at TIMESTAMPTZ, recipient_decision_at TIMESTAMPTZ, withdrawn_at TIMESTAMPTZ, withdrawn_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT post_meeting_words_distinct_members CHECK (author_id <> recipient_id), CONSTRAINT post_meeting_words_once_per_oriented_pair UNIQUE (author_id, recipient_id))`,
        [],
      )
      await sql.query(
        `CREATE INDEX IF NOT EXISTS post_meeting_words_recipient_status_created ON post_meeting_words (recipient_id, status, created_at DESC)`,
        [],
      )
      await sql.query(
        `CREATE INDEX IF NOT EXISTS post_meeting_words_public_recipient ON post_meeting_words (recipient_id, created_at DESC) WHERE status = 'accepted'`,
        [],
      )
    })().catch((error) => {
      schemaPromise = undefined
      throw error
    })
  return schemaPromise
}
