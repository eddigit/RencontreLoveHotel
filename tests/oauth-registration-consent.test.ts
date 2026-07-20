import { describe, expect, it } from 'vitest'
import { LEGAL_POLICY_VERSIONS } from '@/lib/legal-policy'
import {
  createOAuthRegistrationConsentToken,
  verifyOAuthRegistrationConsentToken
} from '@/lib/oauth-registration-consent'

const consent = {
  adult: true,
  terms: true,
  antiSolicitation: true,
  versions: LEGAL_POLICY_VERSIONS
}

describe('OAuth registration consent token', () => {
  it('round-trips current consent for ten minutes', () => {
    const now = Date.UTC(2026, 6, 20, 8, 0, 0)
    const token = createOAuthRegistrationConsentToken(consent, 'test-secret', now)

    expect(verifyOAuthRegistrationConsentToken(token, 'test-secret', now + 60_000)).toEqual(consent)
  })

  it('rejects tampered and expired consent', () => {
    const now = Date.UTC(2026, 6, 20, 8, 0, 0)
    const token = createOAuthRegistrationConsentToken(consent, 'test-secret', now)

    expect(verifyOAuthRegistrationConsentToken(`${token}tampered`, 'test-secret', now)).toBeNull()
    expect(verifyOAuthRegistrationConsentToken(token, 'test-secret', now + 11 * 60_000)).toBeNull()
  })
})
