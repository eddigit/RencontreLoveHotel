CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video')),
  file_name TEXT,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id
  ON message_attachments (message_id, sort_order, created_at);
