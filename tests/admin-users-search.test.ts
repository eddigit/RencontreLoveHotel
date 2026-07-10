import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAdminMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => {
  const fn = vi.fn()
  return Object.assign(fn, { query: vi.fn() })
})

vi.mock('@/lib/server-auth', () => ({
  requireAdmin: requireAdminMock,
  requireCurrentUser: vi.fn(),
  requireSameUserOrAdmin: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: sqlMock }))

describe('admin users search', () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    requireAdminMock.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    sqlMock.mockReset()
    sqlMock.query.mockReset()
  })

  it('returns a server-paginated filtered directory', async () => {
    sqlMock.query.mockResolvedValueOnce([
      {
        id: 'user-1',
        name: 'Couple Paris',
        total_count: '37'
      }
    ])

    const { searchAdminUsers } = await import('@/actions/user-actions')
    const result = await searchAdminUsers({
      page: 2,
      pageSize: 24,
      search: 'Paris',
      accountStatus: 'active',
      profileStatus: 'couple',
      orientation: 'hetero',
      meetingCriterion: 'open_couples'
    })

    expect(result).toMatchObject({
      users: [{ id: 'user-1' }],
      totalCount: 37,
      currentPage: 2,
      totalPages: 2
    })
    const [query, params] = sqlMock.query.mock.calls[0]
    expect(query).toContain('COUNT(*) OVER() AS total_count')
    expect(query).toContain('LIMIT')
    expect(query).toContain('OFFSET')
    expect(query).toContain('LOWER(COALESCE(u.name')
    expect(query).toContain('BOOL_OR(COALESCE(open_to_other_couples, false))')
    expect(query).toContain('umt.open_to_other_couples = TRUE')
    expect(params).toContain('%paris%')
    expect(params).toContain('couple')
    expect(params).toContain('hetero')
  })
})
