import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, requireCurrentUser, createAppNotification } = vi.hoisted(() => ({
  query: vi.fn(),
  requireCurrentUser: vi.fn(),
  createAppNotification: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser }))
vi.mock('@/lib/notification-service', () => ({ createAppNotificationInternal: createAppNotification }))

import { requireModerator } from '@/lib/moderation-auth'
import {
  createModerationDecision,
  getModerationCaseDetail,
  getModerationCases,
  submitModerationAppeal
} from '@/actions/moderation-case-actions'

describe('community moderator least privilege', () => {
  beforeEach(() => {
    query.mockReset()
    requireCurrentUser.mockReset()
    createAppNotification.mockReset()
  })

  it('rejects an ordinary member before database access', async () => {
    requireCurrentUser.mockResolvedValue({ id: 'user-1', role: 'user' })
    await expect(requireModerator()).rejects.toThrow('modération')
    expect(query).not.toHaveBeenCalled()
  })

  it('returns pseudonymized case data to a community moderator', async () => {
    requireCurrentUser.mockResolvedValue({ id: 'mod-1', role: 'community_moderator' })
    query.mockResolvedValueOnce([{
      id: 'case-1',
      subject_pseudonym: 'Membre-12345678',
      user_id: 'private-user-id',
      email: 'private@example.test',
      severity: 'high',
      status: 'new'
    }])

    const cases = await getModerationCases()

    expect(cases[0]).toMatchObject({ id: 'case-1', subject: 'Membre-12345678' })
    expect(cases[0]).not.toHaveProperty('user_id')
    expect(cases[0]).not.toHaveProperty('email')
  })

  it('logs every focused case view without returning identity to a moderator', async () => {
    requireCurrentUser.mockResolvedValue({ id: 'mod-1', role: 'community_moderator' })
    query
      .mockResolvedValueOnce([{
        id: 'case-1', subject_pseudonym: 'Membre-12345678', user_id: 'private-user-id',
        excerpt: 'contenu ciblé', severity: 'high', status: 'new'
      }])
      .mockResolvedValueOnce([])

    const detail = await getModerationCaseDetail('case-1', 'triage')

    expect(detail).not.toHaveProperty('user_id')
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO moderation_case_access'),
      ['case-1', 'mod-1', 'community_moderator', 'triage']
    )
  })

  it('reserves permanent bans for administrators', async () => {
    requireCurrentUser.mockResolvedValue({ id: 'mod-1', role: 'community_moderator' })
    await expect(createModerationDecision({
      caseId: 'case-1', action: 'permanent_ban', reason: 'Motif vérifié'
    })).rejects.toThrow('administrateur')
    expect(query).not.toHaveBeenCalled()
  })

  it('allows the affected member to submit an appeal', async () => {
    requireCurrentUser.mockResolvedValue({ id: 'user-1', role: 'user' })
    query.mockResolvedValueOnce([{ id: 'appeal-1' }])

    await expect(submitModerationAppeal({ caseId: 'case-1', reason: 'Je conteste cette décision.' }))
      .resolves.toEqual({ success: true, appealId: 'appeal-1' })
    expect(query).toHaveBeenCalledWith(expect.stringContaining('moderation_appeals'), [
      'case-1', 'user-1', 'Je conteste cette décision.'
    ])
  })
})
