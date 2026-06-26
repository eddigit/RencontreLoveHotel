CREATE TABLE IF NOT EXISTS conciergerie_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  request_type VARCHAR(100) NOT NULL DEFAULT 'custom_evening',
  response_preference VARCHAR(20) NOT NULL DEFAULT 'email',
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  besoin TEXT NOT NULL,
  budget VARCHAR(100),
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE conciergerie_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(100),
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(100) NOT NULL DEFAULT 'custom_evening',
  ADD COLUMN IF NOT EXISTS response_preference VARCHAR(20) NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_conciergerie_requests_created
  ON conciergerie_requests(created_at DESC);
