import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireCurrentUserMock = vi.hoisted(() => vi.fn())
const markUserSeenMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => {
  const fn = vi.fn()
  return Object.assign(fn, { query: vi.fn() })
})

vi.mock('@/lib/server-auth', () => ({
  requireCurrentUser: requireCurrentUserMock,
  requireAdmin: vi.fn(),
  requireSameUserOrAdmin: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: sqlMock }))

vi.mock('@/lib/presence', () => ({
  markUserSeen: markUserSeenMock,
  ensurePresenceSchema: vi.fn().mockResolvedValue(true),
  isUserRecentlySeen: vi.fn(),
  onlinePresenceCondition: vi.fn((column = 'u.last_seen_at') =>
    `(${column} IS NOT NULL AND ${column} >= NOW() - INTERVAL '10 minutes')`
  )
}))

describe('online community members', () => {
  beforeEach(() => {
    requireCurrentUserMock.mockReset()
    requireCurrentUserMock.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    markUserSeenMock.mockReset()
    markUserSeenMock.mockResolvedValue(undefined)
    sqlMock.query.mockReset()
  })

  it('uses a community-wide presence query and includes the current member', async () => {
    sqlMock.query.mockResolvedValueOnce([
      { id: 'admin-1', name: 'Gilles', online: true, is_current_user: true }
    ])

    const { getOnlineCommunityMembers } = await import('@/actions/user-actions')
    const result = await getOnlineCommunityMembers()

    expect(markUserSeenMock).toHaveBeenCalledWith('admin-1')
    expect(result).toMatchObject([{ id: 'admin-1', is_current_user: true }])
    const [query, params] = sqlMock.query.mock.calls[0]
    expect(query).toContain('up.display_profile = TRUE')
    expect(query).toContain("INTERVAL '10 minutes'")
    expect(query).toContain('u.id = $1 AS is_current_user')
    expect(query).not.toContain('u.id != $1')
    expect(params).toEqual(['admin-1', 12])
  })
})
