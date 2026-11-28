-- Add the generic BDSM meeting category without exposing the separate private role array.
BEGIN;

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_relationship_intents_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_relationship_intents_check
  CHECK (relationship_intents <@ ARRAY['classic', 'serious', 'regular', 'casual', 'libertine', 'bdsm', 'friendship', 'discreet']::text[]);

COMMIT;
