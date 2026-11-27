-- Additive and idempotent. Delivery is deliberately independent from read.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
