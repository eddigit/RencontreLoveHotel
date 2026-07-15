BEGIN;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'match';

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_access_mode_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_access_mode_check
  CHECK (access_mode IN ('match', 'legacy_import', 'admin'));

UPDATE conversations c
SET access_mode = 'admin'
WHERE EXISTS (
  SELECT 1
  FROM conversation_participants cp
  JOIN users u ON u.id = cp.user_id
  WHERE cp.conversation_id = c.id
    AND u.role = 'admin'
);

UPDATE conversations c
SET access_mode = 'legacy_import'
WHERE c.access_mode = 'match'
  AND (
    SELECT COUNT(*)
    FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) >= 2
  AND EXISTS (
    SELECT 1
    FROM messages m
    WHERE m.conversation_id = c.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM conversation_participants cp1
    JOIN conversation_participants cp2
      ON cp2.conversation_id = cp1.conversation_id
     AND cp2.user_id <> cp1.user_id
    JOIN user_matches um
      ON (
        (um.user_id_1 = cp1.user_id AND um.user_id_2 = cp2.user_id)
        OR (um.user_id_1 = cp2.user_id AND um.user_id_2 = cp1.user_id)
      )
     AND um.status = 'accepted'
    WHERE cp1.conversation_id = c.id
  );

CREATE INDEX IF NOT EXISTS idx_conversations_access_mode
  ON conversations (access_mode, updated_at DESC);

COMMIT;
