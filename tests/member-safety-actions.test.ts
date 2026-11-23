import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, requireCurrentUser } = vi.hoisted(() => ({
  query: vi.fn(),
  requireCurrentUser: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser }))
vi.mock('@/lib/notification-service', () => ({ createAppNotificationInternal: vi.fn() }))

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
      'Contenu déplacé dans le profil.',
      null
    ])
  })

  it('rejects a message reference without a server-authorized conversation scope', async () => {
    await expect(reportMember({
      targetUserId: targetId,
      reason: 'paid_sexual_solicitation',
      messageId: '550e8400-e29b-41d4-a716-446655440003'
    })).rejects.toThrow('reference de message exige sa conversation')
    expect(query).not.toHaveBeenCalled()
  })

  it('stores an optional member description as an unverified declaration, not as an excerpt', async () => {
    query
      .mockResolvedValueOnce([{ report_id: 'report-2', investigation_id: 'investigation-2' }])
      .mockResolvedValueOnce([])

    await reportMember({
      targetUserId: targetId,
      reason: 'paid_sexual_solicitation',
      details: 'Contexte transmis de bonne foi.'
    })

    expect(query.mock.calls[0][0]).toContain('WITH report AS')
    expect(query.mock.calls[0][0]).toContain("'member_declaration'")
    expect(query.mock.calls[0][0]).toContain("'unverified'")
    expect(query.mock.calls[0][1][4]).toBe('Contexte transmis de bonne foi.')
  })

  it('accepts a precise message reference only after SQL validates both participants and the message sender', async () => {
    query
      .mockResolvedValueOnce([{ report_id: 'report-3', investigation_id: 'investigation-3' }])
      .mockResolvedValueOnce([])

    await reportMember({
      targetUserId: targetId,
      reason: 'paid_sexual_solicitation',
      conversationId: '550e8400-e29b-41d4-a716-446655440004',
      messageId: '550e8400-e29b-41d4-a716-446655440005'
    })

    expect(query.mock.calls[0][0]).toContain('subject.user_id = $2')
    expect(query.mock.calls[0][0]).toContain('m.sender_id = $2')
    expect(query.mock.calls[0][0]).toContain("CASE WHEN $6::uuid IS NULL THEN 'user' ELSE 'message' END")
    expect(query.mock.calls[0][0]).toContain('LEFT(content, 1000)')
    expect(query.mock.calls[0][0]).toContain("'reference_authorized'")
  })

  it('accepts a dedicated paid sexual solicitation report reason', async () => {
    query
      .mockResolvedValueOnce([{ report_id: 'report-2', investigation_id: 'investigation-2' }])
      .mockResolvedValueOnce([])

    await expect(reportMember({
      targetUserId: targetId,
      reason: 'paid_sexual_solicitation'
    })).resolves.toEqual({ success: true, reportId: 'report-2' })

    expect(query.mock.calls[0][1][3]).toBe('paid_sexual_solicitation')
    expect(query.mock.calls[0][0]).toContain('INSERT INTO moderation_queue')
    expect(query.mock.calls[1][0]).toContain("role IN ('admin', 'community_moderator')")
  })
})
