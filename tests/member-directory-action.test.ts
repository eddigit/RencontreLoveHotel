import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireCurrentUserMock = vi.hoisted(() => vi.fn())
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

describe('member directory action', () => {
  beforeEach(() => {
    requireCurrentUserMock.mockReset()
    requireCurrentUserMock.mockResolvedValue({ id: 'member-1', role: 'user' })
    sqlMock.mockReset()
    sqlMock.query.mockReset()
  })

  it('returns all visible members through a paginated server-side search', async () => {
    sqlMock.query.mockResolvedValueOnce([{ total: '152' }]).mockResolvedValueOnce([
      {
        id: 'member-2',
        name: 'Couple Paris',
        total_count: '152'
      }
    ])

    const { searchCommunityMembers } = await import('@/actions/user-actions')
    const result = await searchCommunityMembers({
      page: 2,
      pageSize: 24,
      search: 'Paris',
      profileType: 'couple',
      orientation: 'hetero',
      meetingCriterion: 'open_curtains'
    })

    expect(requireCurrentUserMock).toHaveBeenCalledOnce()
    expect(result).toMatchObject({
      members: [{ id: 'member-2' }],
      totalCount: 152,
      currentPage: 2,
      totalPages: 7
    })
    const [countQuery, countParams] = sqlMock.query.mock.calls[0]
    const [membersQuery, membersParams] = sqlMock.query.mock.calls[1]
    expect(countQuery).toContain('up.display_profile = TRUE')
    expect(countQuery).toContain('u.onboarding_completed = TRUE')
    expect(countQuery).toContain('LOWER(COALESCE(u.name')
    expect(countQuery).toContain('open_curtains = TRUE')
    expect(countQuery).toContain('couple')
    expect(countParams).toContain('%paris%')
    expect(membersQuery).toContain('LIMIT')
    expect(membersQuery).toContain('OFFSET')
    expect(membersQuery).toContain("NULLIF(BTRIM(u.avatar), '') IS NOT NULL")
    expect(membersParams).toContain(24)
    expect(membersParams).toContain(24)
  })
})
