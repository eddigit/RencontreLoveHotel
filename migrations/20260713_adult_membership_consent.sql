-- Mandatory adult-membership declaration and dated legal consent.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS adult_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adult_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adult_consent_version TEXT,
  ADD COLUMN IF NOT EXISTS adult_verification_method TEXT;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_adult_membership_record_check;

ALTER TABLE users
  ADD CONSTRAINT users_adult_membership_record_check
  CHECK (
    adult_verified_at IS NULL
    OR (
      date_of_birth IS NOT NULL
      AND date_of_birth >= DATE '1900-01-01'
      AND adult_consent_at IS NOT NULL
      AND terms_accepted_at IS NOT NULL
      AND adult_consent_version IS NOT NULL
      AND adult_verification_method IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION validate_adult_membership_record()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.adult_verified_at IS NOT NULL AND (
    NEW.date_of_birth IS NULL
    OR NEW.date_of_birth > (CURRENT_DATE - INTERVAL '18 years')::date
  ) THEN
    RAISE EXCEPTION 'Adult membership requires an age of 18 or older'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_adult_membership ON users;

CREATE TRIGGER enforce_adult_membership
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_adult_membership_record();
