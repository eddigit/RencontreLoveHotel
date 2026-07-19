BEGIN;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS couple_composition TEXT,
  ADD COLUMN IF NOT EXISTS seeking_profile_types TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS relationship_intents TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS bdsm_roles TEXT[] NOT NULL DEFAULT '{}'::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_couple_composition_check'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_couple_composition_check
      CHECK (couple_composition IS NULL OR couple_composition IN ('mixed', 'male_male', 'female_female', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_seeking_profile_types_check'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_seeking_profile_types_check
      CHECK (seeking_profile_types <@ ARRAY['male', 'female', 'couple']::text[]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_relationship_intents_check'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_relationship_intents_check
      CHECK (relationship_intents <@ ARRAY['serious', 'regular', 'casual', 'libertine', 'friendship']::text[]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_bdsm_roles_check'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_bdsm_roles_check
      CHECK (bdsm_roles <@ ARRAY['discovery', 'dominant', 'submissive', 'switch', 'none']::text[]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_bdsm_none_exclusive_check'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_bdsm_none_exclusive_check
      CHECK (NOT ('none' = ANY(bdsm_roles) AND CARDINALITY(bdsm_roles) > 1));
  END IF;
END $$;

COMMIT;
