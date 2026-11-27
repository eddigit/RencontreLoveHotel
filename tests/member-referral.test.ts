import { describe, expect, it } from 'vitest'
import { createMemberReferralToken, referralCodeFromToken } from '@/lib/member-referral'

describe('member referral token', () => {
  it('uses a signed opaque code, never a member identity', () => {
    const code = '11111111-1111-4111-8111-111111111111'
    const value = createMemberReferralToken(code, 'test-secret')
    expect(referralCodeFromToken(value, 'test-secret')).toBe(code)
    expect(referralCodeFromToken(`${value}x`, 'test-secret')).toBeNull()
  })

  it('rejects expired and malformed referral values', () => {
    expect(referralCodeFromToken('not-a-token', 'test-secret')).toBeNull()
    expect(referralCodeFromToken(createMemberReferralToken('11111111-1111-4111-8111-111111111111', 'test-secret', 0), 'test-secret')).toBeNull()
  })
})
