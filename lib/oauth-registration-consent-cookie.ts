import { cookies } from 'next/headers'
import type { RegistrationConsent } from '@/lib/legal-policy'
import {
  OAUTH_REGISTRATION_CONSENT_COOKIE,
  verifyOAuthRegistrationConsentToken
} from '@/lib/oauth-registration-consent'

export async function consumeOAuthRegistrationConsent(): Promise<RegistrationConsent | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(OAUTH_REGISTRATION_CONSENT_COOKIE)?.value
  if (!token) return null

  try {
    cookieStore.delete(OAUTH_REGISTRATION_CONSENT_COOKIE)
  } catch {
    // La validation reste sûre même si le runtime ne permet pas de supprimer le cookie ici.
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ''
  return verifyOAuthRegistrationConsentToken(token, secret)
}
