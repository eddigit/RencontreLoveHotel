import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAdminMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({ sql: { query: vi.fn() } }))
vi.mock('@/lib/server-auth', () => ({
  requireAdmin: requireAdminMock,
  requireCurrentUser: vi.fn(),
  requireSameUserOrAdmin: vi.fn()
}))
vi.mock('@/lib/admin-user-star', () => ({ ensureAdminUserStarSchema: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/notification-service', () => ({
  createAppNotificationInternal: vi.fn(),
  createNotificationInternal: vi.fn(),
  notifyAdminsInternal: vi.fn()
}))

import { starSelectedMembers } from '@/actions/admin-member-selection-actions'
import { sendInternalMessageToMembers } from '@/actions/notification-actions'
import { createAppNotificationInternal } from '@/lib/notification-service'
import { sql } from '@/lib/db'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const query = sql.query as any

beforeEach(() => {
  query.mockReset()
  ;(createAppNotificationInternal as any).mockReset()
  requireAdminMock.mockReset()
  requireAdminMock.mockResolvedValue({ id: ADMIN, role: 'admin' })
})

describe('sendInternalMessageToMembers', () => {
  const message = { title: 'Une photo ?', description: 'Ajoutez une photo à votre fiche.' }

  it('requires admin access before any query', async () => {
    requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))
    await expect(sendInternalMessageToMembers({ ...message, userIds: [A] })).rejects.toThrow('administrateur')
    expect(query).not.toHaveBeenCalled()
  })

  it('refuses an empty or malformed selection', async () => {
    await expect(sendInternalMessageToMembers({ ...message, userIds: [] })).rejects.toThrow('Sélection')
    await expect(sendInternalMessageToMembers({ ...message, userIds: ['x; DROP TABLE users'] })).rejects.toThrow('Sélection')
    expect(query).not.toHaveBeenCalled()
  })

  it('writes only to the selected, active members and reports the ones left out', async () => {
    query
      .mockResolvedValueOnce([{ id: A }, { id: B }]) // C is banned or missing
      .mockResolvedValueOnce([{ id: 'conv-a' }]) // A: existing admin conversation
      .mockResolvedValueOnce([{ id: 'msg-a' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]) // B: no conversation yet
      .mockResolvedValueOnce([{ id: 'conv-b' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'msg-b' }])
      .mockResolvedValueOnce([])

    const result = await sendInternalMessageToMembers({ ...message, userIds: [A, B, C, A] })

    const [recipientSql, recipientParams] = query.mock.calls[0]
    expect(recipientSql).toContain('ANY($2::uuid[])')
    expect(recipientSql).toContain("COALESCE(u.status, 'active') = 'active'")
    expect(recipientSql).toContain('COALESCE(u.is_banned, false) = false')
    expect(recipientParams).toEqual([ADMIN, [A, B, C]])
    expect(result).toMatchObject({ requestedCount: 3, recipientCount: 2, messageCount: 2, skippedCount: 1, createdConversationCount: 1 })
    expect(createAppNotificationInternal).toHaveBeenCalledTimes(2)
  })
})

describe('starSelectedMembers', () => {
  it('requires admin access before any query', async () => {
    requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))
    await expect(starSelectedMembers([A])).rejects.toThrow('administrateur')
    expect(query).not.toHaveBeenCalled()
  })

  it('features only members with an eligible personal photo and names the rest', async () => {
    query
      .mockResolvedValueOnce([
        { id: A, has_eligible_photo: true, already_starred: false },
        { id: B, has_eligible_photo: false, already_starred: false },
        { id: C, has_eligible_photo: true, already_starred: true }
      ])
      .mockResolvedValueOnce([{ id: A }])

    const result = await starSelectedMembers([A, B, C])

    const [updateSql, updateParams] = query.mock.calls[1]
    expect(updateSql).toContain('admin_starred_at')
    expect(updateParams).toEqual([[A]])
    expect(result).toEqual({ starredCount: 1, alreadyStarredCount: 1, withoutPhotoIds: [B] })
  })

  it('does not update anything when no selected member has a photo', async () => {
    query.mockResolvedValueOnce([{ id: B, has_eligible_photo: false, already_starred: false }])
    const result = await starSelectedMembers([B])
    expect(query).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ starredCount: 0, alreadyStarredCount: 0, withoutPhotoIds: [B] })
  })
})
