// Used only with the fixed users/user_profiles aliases of member-facing queries.
export const verifiedPhotoPredicateSql = () => `(
  up.display_profile IS TRUE
  AND NOT COALESCE(u.is_banned, FALSE)
  AND COALESCE(u.status, 'active') = 'active'
  AND EXISTS (
    SELECT 1 FROM private_photo_verification_requests verification
    WHERE verification.user_id = u.id AND verification.status = 'approved'
      AND verification.pseudonym_snapshot = trim(u.name)
      AND verification.identity_kind = CASE
        WHEN lower(up.status) LIKE 'couple%' OR lower(up.gender) LIKE 'couple%' THEN 'couple'
        WHEN lower(up.status) LIKE 'single_%' OR lower(up.gender) IN ('female','male','trans','woman','man') THEN 'solo'
      END
  )
)`
