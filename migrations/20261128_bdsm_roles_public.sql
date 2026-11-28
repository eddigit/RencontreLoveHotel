-- BDSM matching roles remain private unless a member explicitly opts into publication.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS bdsm_roles_public BOOLEAN NOT NULL DEFAULT FALSE;
