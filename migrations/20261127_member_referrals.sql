CREATE TABLE IF NOT EXISTS member_referral_codes (
  referrer_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS member_referrals (
  referee_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT member_referrals_distinct_members CHECK (referee_id <> referrer_id)
);
CREATE INDEX IF NOT EXISTS idx_member_referrals_referrer_created ON member_referrals (referrer_id, created_at DESC);
