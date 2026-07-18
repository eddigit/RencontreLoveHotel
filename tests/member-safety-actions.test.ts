import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ sql: { query: vi.fn() } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser: vi.fn() }))
vi.mock('@/lib/admin-email-notifications', () => ({ notifyAdminByEmail: vi.fn() }))

import {
  blockMember,
  getMemberSafetyState,
  reportProfile,
  unblockMember
} from '@/actions/member-safety-actions'
import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'
import { notifyAdminByEmail } from '@/lib/admin-email-notifications'

const currentUser = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'user',
  email: 'member@example.com'
}
const targetId = '22222222-2222-4222-8222-222222222222'

describe('member safety actions', () => {
  beforeEach(() => {
    vi.mocked(sql.query).mockReset()
    vi.mocked(requireCurrentUser).mockReset()
    vi.mocked(requireCurrentUser).mockResolvedValue(currentUser)
    vi.mocked(notifyAdminByEmail).mockReset()
    vi.mocked(notifyAdminByEmail).mockResolvedValue(true)
  })

  it('requires the current session and prevents self blocking', async () => {
    await expect(blockMember(currentUser.id)).rejects.toThrow('propre profil')
    expect(sql.query).not.toHaveBeenCalled()

    vi.mocked(requireCurrentUser).mockRejectedValueOnce(new Error('Authentification requise'))
    await expect(getMemberSafetyState(targetId)).rejects.toThrow('Authentification requise')
  })

  it('creates and removes a personal block without banning the target account', async () => {
    vi.mocked(sql.query)
      .mockResolvedValueOnce([{ id: targetId }])
      .mockResolvedValueOnce([{ id: 'block-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await expect(blockMember(targetId)).resolves.toEqual({ success: true })
    await expect(unblockMember(targetId)).resolves.toEqual({ success: true })

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_blocks'),
      [currentUser.id, targetId]
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM user_matches'),
      [currentUser.id, targetId]
    )
    expect(sql.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users'),
      expect.anything()
    )
  })

  it('returns reciprocal safety state', async () => {
    vi.mocked(sql.query).mockResolvedValueOnce([{
      blocked_by_a: true,
      blocked_by_b: false
    }])

    await expect(getMemberSafetyState(targetId)).resolves.toEqual({
      blockedByMe: true,
      blockedMe: false,
      canInteract: false
    })
  })

  it('queues a profile report and notifies admins without automatic sanction', async () => {
    vi.mocked(sql.query)
      .mockResolvedValueOnce([{ id: targetId, name: 'Profil cible' }])
      .mockResolvedValueOnce([{ id: 'report-1' }])
      .mockResolvedValueOnce([])

    await expect(reportProfile({
      memberId: targetId,
      reason: 'harassment',
      details: 'Messages insistants et irrespectueux.'
    })).resolves.toEqual({ success: true, reportId: 'report-1' })

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO profile_reports'),
      [currentUser.id, targetId, 'harassment', 'Messages insistants et irrespectueux.']
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO moderation_queue'),
      expect.arrayContaining(['profile', targetId, targetId])
    )
    expect(notifyAdminByEmail).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'profile_reported', actionPath: '/admin/moderation' })
    )
    expect(sql.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users'),
      expect.anything()
    )
  })

  it('requires a supported report reason', async () => {
    await expect(reportProfile({
      memberId: targetId,
      reason: 'invalid' as any
    })).rejects.toThrow('Motif de signalement invalide')
    expect(sql.query).not.toHaveBeenCalled()
  })
})
