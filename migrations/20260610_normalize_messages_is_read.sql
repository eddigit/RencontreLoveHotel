DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'read'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'is_read'
  ) THEN
    ALTER TABLE messages RENAME COLUMN read TO is_read;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'is_read'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_read boolean DEFAULT false;
  END IF;
END $$;

UPDATE messages SET is_read = false WHERE is_read IS NULL;

ALTER TABLE messages
  ALTER COLUMN is_read SET DEFAULT false,
  ALTER COLUMN is_read SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_id
  ON messages (conversation_id, created_at, id);
