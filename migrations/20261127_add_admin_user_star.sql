-- Additive and idempotent. NULL means the member is not currently starred.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_starred_at TIMESTAMPTZ;
