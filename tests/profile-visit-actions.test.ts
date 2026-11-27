import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, requireCurrentUser } = vi.hoisted(() => ({
  query: vi.fn(),
  requireCurrentUser: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser }))
vi.mock('@/lib/profile-visits', () => ({ ensureProfileVisitsSchema: vi.fn().mockResolvedValue(undefined) }))

import { getProfileVisitors, recordProfileVisit } from '@/actions/profile-visit-actions'

const visitorId = '550e8400-e29b-41d4-a716-446655440001'
const profileId = '550e8400-e29b-41d4-a716-446655440002'

describe('profile visit actions', () => {
  beforeEach(() => {
    query.mockReset()
    requireCurrentUser.mockReset()
    requireCurrentUser.mockResolvedValue({ id: visitorId, role: 'user' })
  })

  it('records only eligible real member visits and deduplicates them', async () => {
    query.mockResolvedValueOnce([{ visited_at: '2026-11-28T10:00:00.000Z' }])

    await expect(recordProfileVisit(profileId)).resolves.toEqual({ recorded: true })
    const [statement, params] = query.mock.calls[0]
    expect(params).toEqual([visitorId, profileId])
    expect(statement).toContain('JOIN user_profiles visitor_profile')
    expect(statement).toContain('visited_profile.display_profile = TRUE')
    expect(statement).toContain('COALESCE(visited.is_banned, false) = false')
    expect(statement).toContain('FROM user_blocks block')
    expect(statement).toContain('ON CONFLICT (visitor_id, visited_id)')
    expect(statement).toContain('SELECT DISTINCT visitor.id AS visitor_id')
    expect(statement).toContain("INTERVAL '30 days'")
    expect(statement).toContain('AND NOT (visitor_id = $1 AND visited_id = $2)')
  })

  it('does not write a self visit or an invalid client-provided id', async () => {
    await expect(recordProfileVisit(visitorId)).resolves.toEqual({ recorded: false })
    await expect(recordProfileVisit('not-a-uuid')).resolves.toEqual({ recorded: false })
    expect(query).not.toHaveBeenCalled()
  })

  it('returns only the authenticated owner history, filtered to 30 days and safe members', async () => {
    query.mockResolvedValueOnce([])

    await expect(getProfileVisitors(99)).resolves.toEqual([])
    const [statement, params] = query.mock.calls[0]
    expect(params).toEqual([visitorId, 24])
    expect(statement).toContain('profile_visits.visited_id = $1')
    expect(statement).toContain("profile_visits.visited_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'")
    expect(statement).toContain('visitor_profile.display_profile = TRUE')
    expect(statement).toContain('owner_profile.display_profile = TRUE')
    expect(statement).toContain('SELECT DISTINCT ON (visitor.id)')
    expect(statement).toContain('FROM user_blocks block')
  })
})
