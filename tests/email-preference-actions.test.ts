import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireCurrentUserMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => Object.assign(vi.fn(), { query: vi.fn() }))

vi.mock('@/lib/db', () => ({ sql: sqlMock }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser: requireCurrentUserMock }))

import { sql } from '@/lib/db'
import {
  getOwnEmailPreferences,
  updateOwnEmailPreferences
} from '@/actions/email-preference-actions'

describe('member email preference actions', () => {
  beforeEach(() => {
    requireCurrentUserMock.mockReset().mockResolvedValue({ id: 'member-1' })
    sqlMock.query.mockReset()
  })

  it('reads only the authenticated member preference row', async () => {
    sqlMock.query.mockResolvedValueOnce([])

    await expect(getOwnEmailPreferences()).resolves.toEqual({
      campaignOptIn: false,
      activityEmailConsent: false,
      messageEmailEnabled: false,
      matchEmailEnabled: false,
      eventEmailEnabled: false
    })
    expect(sqlMock.query.mock.calls[0][1]).toEqual(['member-1'])
  })

  it('requires authentication before reading or writing', async () => {
    requireCurrentUserMock.mockRejectedValueOnce(new Error('Authentification requise'))
    await expect(getOwnEmailPreferences()).rejects.toThrow('Authentification requise')
    expect(sql).not.toHaveBeenCalled()
    expect(sqlMock.query).not.toHaveBeenCalled()
  })

  it('clears every activity category server-side when consent is disabled', async () => {
    sqlMock.query.mockResolvedValueOnce([{
      campaign_opt_in: true,
      activity_email_consent: false,
      message_email_enabled: false,
      match_email_enabled: false,
      event_email_enabled: false
    }])

    await expect(updateOwnEmailPreferences({
      campaignOptIn: true,
      activityEmailConsent: false,
      messageEmailEnabled: true,
      matchEmailEnabled: true,
      eventEmailEnabled: true
    })).resolves.toEqual({
      campaignOptIn: true,
      activityEmailConsent: false,
      messageEmailEnabled: false,
      matchEmailEnabled: false,
      eventEmailEnabled: false
    })

    expect(sqlMock.query.mock.calls[0][1]).toEqual([
      'member-1', true, false, false, false, false
    ])
  })
})
