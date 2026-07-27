ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_seeking_profile_types_trans_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_seeking_profile_types_trans_check
  CHECK (
    seeking_profile_types
    <@ ARRAY['male', 'female', 'couple', 'trans']::text[]
  )
  NOT VALID;

ALTER TABLE user_profiles
  VALIDATE CONSTRAINT user_profiles_seeking_profile_types_trans_check;

BEGIN;

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_seeking_profile_types_check;

ALTER TABLE user_profiles
  RENAME CONSTRAINT user_profiles_seeking_profile_types_trans_check
  TO user_profiles_seeking_profile_types_check;

COMMIT;
