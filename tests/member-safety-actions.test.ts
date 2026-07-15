import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, requireCurrentUser } = vi.hoisted(() => ({
  query: vi.fn(),
  requireCurrentUser: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser }))
vi.mock('@/actions/notification-actions', () => ({ createAppNotification: vi.fn() }))

import { blockMember, reportMember } from '@/actions/member-safety-actions'

const currentId = '550e8400-e29b-41d4-a716-446655440001'
const targetId = '550e8400-e29b-41d4-a716-446655440002'

describe('member safety actions', () => {
  beforeEach(() => {
    query.mockReset()
    requireCurrentUser.mockResolvedValue({ id: currentId, role: 'user' })
  })

  it('blocks a member and closes the relationship in one database operation', async () => {
    query.mockResolvedValueOnce([{ blocked_id: targetId }])

    await expect(blockMember(targetId)).resolves.toEqual({ success: true })
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_blocks'), [currentId, targetId])
    expect(query.mock.calls[0][0]).toContain('DELETE FROM user_matches')
  })

  it('rejects unsupported report reasons before writing data', async () => {
    await expect(reportMember({ targetUserId: targetId, reason: 'anything' as any }))
      .rejects.toThrow('Motif de signalement invalide')
    expect(query).not.toHaveBeenCalled()
  })

  it('stores a bounded moderation report', async () => {
    query.mockResolvedValueOnce([{ id: 'report-1' }]).mockResolvedValueOnce([])

    await expect(reportMember({
      targetUserId: targetId,
      reason: 'inappropriate_content',
      details: 'Contenu déplacé dans le profil.'
    })).resolves.toEqual({ success: true, reportId: 'report-1' })

    expect(query.mock.calls[0][0]).toContain('INSERT INTO user_reports')
    expect(query.mock.calls[0][1]).toEqual([
      currentId,
      targetId,
      null,
      'inappropriate_content',
      'Contenu déplacé dans le profil.'
    ])
  })
})
