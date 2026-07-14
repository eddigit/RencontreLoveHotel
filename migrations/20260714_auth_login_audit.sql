-- Journal minimal des connexions. Aucun mot de passe, token ou secret n'est stocké.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  event TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_logs_level_check
    CHECK (level IN ('info', 'warn', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_level_created
  ON auth_logs (level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_logs_event_created
  ON auth_logs (event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_logs_email_created
  ON auth_logs (LOWER(email), created_at DESC)
  WHERE email IS NOT NULL;
