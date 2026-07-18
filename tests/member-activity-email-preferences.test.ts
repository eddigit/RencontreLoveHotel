import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireCurrentUserMock = vi.hoisted(() => vi.fn())
const queryMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/server-auth', () => ({
  requireCurrentUser: requireCurrentUserMock
}))

vi.mock('@/lib/db', () => ({
  sql: { query: queryMock }
}))

import {
  getActivityEmailPreference,
  updateActivityEmailPreference
} from '@/actions/email-preference-actions'

describe('member activity email preferences', () => {
  beforeEach(() => {
    requireCurrentUserMock.mockReset()
    queryMock.mockReset()
    requireCurrentUserMock.mockResolvedValue({ id: 'user-1', role: 'user' })
  })

  it('adds explicit opt-in columns with safe defaults', () => {
    const migration = readFileSync(
      'migrations/20260713_member_activity_email_preferences.sql',
      'utf8'
    )

    expect(migration).toContain('activity_email_consent BOOLEAN NOT NULL DEFAULT FALSE')
    expect(migration).toContain('activity_email_decided_at TIMESTAMPTZ')
    expect(migration).toContain('message_email_enabled BOOLEAN NOT NULL DEFAULT FALSE')
    expect(migration).toContain('match_email_enabled BOOLEAN NOT NULL DEFAULT FALSE')
    expect(migration).toContain('event_email_enabled BOOLEAN NOT NULL DEFAULT FALSE')
  })

  it('returns a decision-required, fully disabled preference when no row exists', async () => {
    queryMock.mockResolvedValueOnce([])

    await expect(getActivityEmailPreference()).resolves.toEqual({
      consent: false,
      decisionRequired: true,
      messages: false,
      matches: false,
      events: false
    })
    expect(requireCurrentUserMock).toHaveBeenCalledOnce()
  })

  it('forces every category off when master consent is declined', async () => {
    queryMock.mockResolvedValueOnce([])

    await expect(
      updateActivityEmailPreference({
        consent: false,
        messages: true,
        matches: true,
        events: true,
        source: 'login_prompt'
      })
    ).resolves.toEqual({
      consent: false,
      decisionRequired: false,
      messages: false,
      matches: false,
      events: false
    })

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('activity_email_decided_at'),
      ['user-1', false, false, false, false, 'login_prompt']
    )
  })

  it('does not touch preferences when the session guard rejects', async () => {
    requireCurrentUserMock.mockRejectedValueOnce(new Error('Authentification requise'))

    await expect(getActivityEmailPreference()).rejects.toThrow('Authentification')
    expect(queryMock).not.toHaveBeenCalled()
  })
})
