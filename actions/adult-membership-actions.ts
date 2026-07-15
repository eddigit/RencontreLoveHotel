'use server'

import { revalidatePath } from 'next/cache'
import { executeQuery } from '@/lib/db'
import { requireAuthenticatedUser } from '@/lib/server-auth'
import {
  ADULT_CONSENT_VERSION,
  validateAdultDateOfBirth
} from '@/lib/adult-membership'

export async function confirmAdultMembership (input: {
  dateOfBirth: string
  adultConsent: boolean
  termsAccepted: boolean
}) {
  const user = await requireAuthenticatedUser()

  if (input.adultConsent !== true) {
    return { success: false, error: 'Vous devez certifier être majeur.' }
  }
  if (input.termsAccepted !== true) {
    return { success: false, error: 'Vous devez accepter les conditions d’utilisation.' }
  }

  const validation = validateAdultDateOfBirth(input.dateOfBirth)
  if (!validation.ok) return { success: false, error: validation.error }

  await executeQuery(
    `
      WITH verified_user AS (
        UPDATE users
        SET date_of_birth = $2::date,
            adult_consent_at = CURRENT_TIMESTAMP,
            adult_verified_at = CURRENT_TIMESTAMP,
            terms_accepted_at = CURRENT_TIMESTAMP,
            adult_consent_version = $3,
            adult_verification_method = 'self_declared_birth_date',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND adult_verified_at IS NULL
        RETURNING id, date_of_birth
      ), updated_profile AS (
        UPDATE user_profiles p
        SET birthday = verified_user.date_of_birth,
            age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, verified_user.date_of_birth))::INTEGER,
            updated_at = CURRENT_TIMESTAMP
        FROM verified_user
        WHERE p.user_id = verified_user.id
        RETURNING p.user_id
      )
      INSERT INTO user_profiles (id, user_id, birthday, age)
      SELECT gen_random_uuid(), verified_user.id, verified_user.date_of_birth,
             EXTRACT(YEAR FROM AGE(CURRENT_DATE, verified_user.date_of_birth))::INTEGER
      FROM verified_user
      WHERE NOT EXISTS (
        SELECT 1 FROM updated_profile WHERE updated_profile.user_id = verified_user.id
      )
    `,
    [user.id, validation.dateOfBirth, ADULT_CONSENT_VERSION]
  )

  revalidatePath('/onboarding')
  revalidatePath('/profile')
  return { success: true }
}
