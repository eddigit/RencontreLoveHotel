import type { RegistrationConsent } from '@/lib/legal-policy'
import { isCurrentRegistrationConsent } from '@/lib/legal-policy'
import { signPayload, verifySignedPayload } from '@/lib/signed-payload'

export const OAUTH_REGISTRATION_CONSENT_COOKIE = 'lhr_oauth_registration_consent'
export const OAUTH_REGISTRATION_CONSENT_MAX_AGE_SECONDS = 10 * 60

type OAuthConsentPayload = {
  purpose: 'oauth-registration-consent'
  consent: RegistrationConsent
  expiresAt: number
}

export function createOAuthRegistrationConsentToken(
  consent: RegistrationConsent,
  secret: string,
  now = Date.now()
): string {
  if (!isCurrentRegistrationConsent(consent)) {
    throw new Error('Consentements obligatoires invalides.')
  }

  return signPayload({
    purpose: 'oauth-registration-consent',
    consent,
    expiresAt: now + OAUTH_REGISTRATION_CONSENT_MAX_AGE_SECONDS * 1000
  } satisfies OAuthConsentPayload, secret)
}

export function verifyOAuthRegistrationConsentToken(
  token: string,
  secret: string,
  now = Date.now()
): RegistrationConsent | null {
  const payload = verifySignedPayload<OAuthConsentPayload>(token, secret)
  if (
    payload?.purpose !== 'oauth-registration-consent' ||
    payload.expiresAt < now ||
    !isCurrentRegistrationConsent(payload.consent)
  ) {
    return null
  }
  return payload.consent
}
