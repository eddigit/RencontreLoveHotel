import { describe, expect, it } from 'vitest'
import {
  createEmailVerificationToken,
  digestEmailVerificationToken,
  verifyEmailVerificationToken
} from '@/lib/email-verification-token'

describe('email verification token', () => {
  it('binds a one-hour signed token to the normalized email', () => {
    const now = Date.UTC(2026, 6, 20, 8, 0, 0)
    const token = createEmailVerificationToken('Member@Example.com', 'test-secret', now)

    expect(verifyEmailVerificationToken(token, 'test-secret', now + 30 * 60_000)).toEqual({
      email: 'member@example.com'
    })
    expect(digestEmailVerificationToken(token)).toMatch(/^[a-f0-9]{64}$/)
    expect(digestEmailVerificationToken(token)).not.toBe(token)
  })

  it('rejects tampered and expired tokens', () => {
    const now = Date.UTC(2026, 6, 20, 8, 0, 0)
    const token = createEmailVerificationToken('member@example.com', 'test-secret', now)

    expect(verifyEmailVerificationToken(`${token}tampered`, 'test-secret', now)).toBeNull()
    expect(verifyEmailVerificationToken(token, 'test-secret', now + 61 * 60_000)).toBeNull()
  })
})
