-- Keep the controlled relationship intent vocabulary in sync with the profile UI.
-- Replacing this check is safe and idempotent for both fresh and already deployed databases.
BEGIN;

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_relationship_intents_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_relationship_intents_check
  CHECK (relationship_intents <@ ARRAY['classic', 'serious', 'regular', 'casual', 'libertine', 'friendship', 'discreet']::text[]);

COMMIT;
