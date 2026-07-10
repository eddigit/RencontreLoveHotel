import { readFileSync } from 'fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const executeQueryMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => {
  const fn = vi.fn()
  return Object.assign(fn, { query: vi.fn() })
})

vi.mock('next-auth/next', () => ({
  getServerSession: getServerSessionMock
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@/lib/db', () => ({
  executeQuery: executeQueryMock,
  sql: sqlMock
}))

vi.mock('@/actions/notification-actions', () => ({
  createNotification: vi.fn()
}))

describe('server action authorization guards', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    executeQueryMock.mockReset()
    sqlMock.mockReset()
    sqlMock.query.mockReset()
  })

  it('blocks message moderation actions for non-admin users', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { getAllMessages } = await import('@/actions/message-actions')

    await expect(getAllMessages({ page: 1, limit: 10 })).rejects.toThrow(
      'administrateur'
    )
    expect(executeQueryMock).not.toHaveBeenCalled()
  })

  it('allows admin message moderation actions to reach the database', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' }
    })
    executeQueryMock.mockResolvedValue([])

    const { deleteMessage } = await import('@/actions/message-actions')

    await deleteMessage('message-1')

    expect(executeQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE messages'),
      expect.arrayContaining(['message-1'])
    )
  })

  it('blocks user deletion for non-admin users', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { deleteUserByAdmin } = await import('@/actions/user-actions')

    await expect(deleteUserByAdmin('target-user')).rejects.toThrow(
      'administrateur'
    )
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('blocks event creation for another member account', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { createEvent } = await import('@/actions/event-actions')

    await expect(
      createEvent({
        title: 'Apéro jacuzzi',
        location: 'Pigalle',
        date: new Date(Date.now() + 86_400_000).toISOString(),
        creator_id: 'user-2'
      })
    ).rejects.toThrow('propre compte')
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('blocks event subscription for another member account', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { subscribeToEvent } = await import('@/actions/event-actions')

    await expect(subscribeToEvent('event-1', 'user-2')).rejects.toThrow(
      'propre compte'
    )
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('returns no accepted matches for another account without querying the database', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { getUserMatches } = await import('@/actions/user-actions')

    await expect(getUserMatches('user-2')).resolves.toEqual([])
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('counts visible community members for authenticated dashboards', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })
    sqlMock.query.mockResolvedValueOnce([
      { total_members: '1064', new_members_last_24h: '8' }
    ])

    const { getCommunityMemberStats } = await import('@/actions/user-actions')

    await expect(getCommunityMemberStats()).resolves.toEqual({
      totalMembers: 1064,
      newMembersLast24h: 8
    })

    expect(sqlMock.query).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(*) FILTER'),
      []
    )
    const [query] = sqlMock.query.mock.calls[0]
    expect(query).toContain('up.display_profile = TRUE')
    expect(query).toContain('u.onboarding_completed = TRUE')
    expect(query).toContain("COALESCE(u.status, 'active') <> 'banned'")
    expect(query).toContain("INTERVAL '24 hours'")

    const userActionsSource = readFileSync('actions/user-actions.ts', 'utf8')
    expect(userActionsSource).toContain('u.created_at,')
  })

  it('returns no pending match requests for another account without querying the database', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { getIncomingMatchRequests, getOutgoingMatchRequests } = await import(
      '@/actions/user-actions'
    )

    await expect(getIncomingMatchRequests('user-2')).resolves.toEqual([])
    await expect(getOutgoingMatchRequests('user-2')).resolves.toEqual([])
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('blocks wall moderation actions for non-admin users', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { restoreWallModerationItem } = await import('@/actions/admin-moderation-actions')

    await expect(
      restoreWallModerationItem({ itemId: 'queue-1' })
    ).rejects.toThrow('administrateur')
    expect(sqlMock.query).not.toHaveBeenCalled()
  })
})
