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

  it('allows only the enabled member activity category after explicit consent', () => {
    expect(
      canSendEmailForPurpose({
        purpose: 'message_alert',
        requestedByUser: false,
        user: { status: 'active', isBanned: false },
        preference: { activityEmailConsent: true, messageEmailEnabled: true },
        suppressed: false
      })
    ).toEqual({ allowed: true, reason: 'activity_opted_in' })

    expect(
      canSendEmailForPurpose({
        purpose: 'match_alert',
        requestedByUser: false,
        user: { status: 'active', isBanned: false },
        preference: { activityEmailConsent: true, matchEmailEnabled: false },
        suppressed: false
      })
    ).toEqual({ allowed: false, reason: 'activity_category_disabled' })
  })

  it('requires explicit activity consent before any member activity email', () => {
    expect(
      canSendEmailForPurpose({
        purpose: 'event_alert',
        requestedByUser: false,
        user: { status: 'active', isBanned: false },
        preference: { activityEmailConsent: false, eventEmailEnabled: true },
        suppressed: false
      })
    ).toEqual({ allowed: false, reason: 'missing_activity_consent' })
  })

  it('keeps activity alerts independent from campaign opt-out while honoring global suppression', () => {
    const input = {
      purpose: 'event_alert',
      requestedByUser: false,
      user: { status: 'active', isBanned: false },
      preference: { optedOutAt: '2026-11-27T00:00:00Z', activityEmailConsent: true, eventEmailEnabled: true }
    } as const
    expect(canSendEmailForPurpose({ ...input, suppressed: false }))
      .toEqual({ allowed: true, reason: 'activity_opted_in' })
    expect(canSendEmailForPurpose({ ...input, suppressed: true }))
      .toEqual({ allowed: false, reason: 'suppressed' })
  })

  it('normalizes unknown purposes into blocked automated email', () => {
    expect(normalizeEmailPurpose('weekly_newsletter')).toBe('other')
  })
})
