import { describe, expect, it } from 'vitest'
import { canSendEmailForPurpose, normalizeEmailPurpose } from '../lib/email-policy'

describe('email policy', () => {
  it('allows explicit password reset even when campaign opt-in is false', () => {
    expect(
      canSendEmailForPurpose({
        purpose: 'password_reset',
        requestedByUser: true,
        user: { status: 'active', isBanned: false },
        preference: {
          campaignOptIn: false,
          optedOutAt: '2026-06-01T00:00:00Z'
        },
        suppressed: false
      })
    ).toEqual({ allowed: true, reason: 'password_reset_requested' })
  })

  it('blocks password reset when it was not explicitly requested', () => {
    expect(
      canSendEmailForPurpose({
        purpose: 'password_reset',
        requestedByUser: false,
        user: { status: 'active', isBanned: false },
        preference: { campaignOptIn: true },
        suppressed: false
      })
    ).toEqual({ allowed: false, reason: 'password_reset_not_requested' })
  })

  it('blocks campaigns without explicit opt-in', () => {
    expect(
      canSendEmailForPurpose({
        purpose: 'campaign',
        requestedByUser: false,
        user: { status: 'active', isBanned: false },
        preference: { campaignOptIn: false },
        suppressed: false
      })
    ).toEqual({ allowed: false, reason: 'missing_campaign_opt_in' })
  })

  it('blocks campaigns for suppressed users even if opted in', () => {
    expect(
      canSendEmailForPurpose({
        purpose: 'campaign',
        requestedByUser: false,
        user: { status: 'active', isBanned: false },
        preference: { campaignOptIn: true },
        suppressed: true
      })
    ).toEqual({ allowed: false, reason: 'suppressed' })
  })

  it('blocks all other automated member email purposes by default', () => {
    expect(
      canSendEmailForPurpose({
        purpose: 'event',
        requestedByUser: false,
        user: { status: 'active', isBanned: false },
        preference: { campaignOptIn: true },
        suppressed: false
      })
    ).toEqual({ allowed: false, reason: 'purpose_blocked_by_default' })
  })

  it('normalizes unknown purposes into blocked automated email', () => {
    expect(normalizeEmailPurpose('weekly_newsletter')).toBe('other')
  })
})
