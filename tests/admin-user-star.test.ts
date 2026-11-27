import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAdminMock = vi.hoisted(() => vi.fn())
const revalidatePathMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => Object.assign(vi.fn(), { query: vi.fn() }))

vi.mock('@/lib/db', () => ({
  sql: sqlMock,
}))

vi.mock('@/lib/server-auth', () => ({ requireAdmin: requireAdminMock }))
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/lib/admin-user-star', () => ({
  ensureAdminUserStarSchema: vi.fn().mockResolvedValue(undefined)
}))

import { sql } from '@/lib/db'
import { getAllUsers, setUserAdminStar, setModeratorSpotlight } from '@/actions/user-actions'

describe('setUserAdminStar', () => {
  beforeEach(() => {
    sqlMock.mockReset()
    sqlMock.query.mockReset()
    requireAdminMock.mockReset().mockResolvedValue({ id: 'admin-1', role: 'admin' })
    revalidatePathMock.mockReset()
  })

  it('requires an administrator before writing the reversible marker', async () => {
    requireAdminMock.mockRejectedValueOnce(new Error('Accès administrateur requis'))

    await expect(setUserAdminStar('member-1', true)).rejects.toThrow('administrateur')
    expect(sql).not.toHaveBeenCalled()
  })

  it('persists and returns the star timestamp', async () => {
    sqlMock.query.mockResolvedValueOnce([
      { id: 'member-1', has_eligible_photo: true }
    ])
    vi.mocked(sql).mockResolvedValueOnce([
      { id: 'member-1', admin_starred_at: '2026-11-27T12:00:00.000Z' }
    ])

    await expect(setUserAdminStar('member-1', true)).resolves.toEqual({
      id: 'member-1',
      adminStarredAt: '2026-11-27T12:00:00.000Z'
    })
    expect(sql).toHaveBeenCalledTimes(1)
    expect(sqlMock.query).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/users')
  })

  it('clears the marker instead of deleting a user', async () => {
    sqlMock.query.mockResolvedValueOnce([{ id: 'member-1', has_eligible_photo: false }])
    vi.mocked(sql).mockResolvedValueOnce([{ id: 'member-1', admin_starred_at: null }])

    await expect(setUserAdminStar('member-1', false)).resolves.toEqual({
      id: 'member-1',
      adminStarredAt: null
    })
  })

  it('refuses to star a profile without an eligible member photo', async () => {
    sqlMock.query.mockResolvedValueOnce([{ id: 'member-1', has_eligible_photo: false }])

    await expect(setUserAdminStar('member-1', true)).rejects.toThrow('photo membre éligible')
    expect(sql).not.toHaveBeenCalled()
  })

  it('stores the editorial moderator label independently of roles and favorites', async () => {
    vi.mocked(sql).mockResolvedValueOnce([{ moderator_spotlight_at: '2026-11-27' }])
    expect(await setModeratorSpotlight('member-1', true)).toBe(true)
    const query = sqlMock.mock.calls[0][0].join('?')
    expect(query).toContain('UPDATE users SET moderator_spotlight_at')
    expect(query).not.toMatch(/admin_starred_at|\brole\b/)
    requireAdminMock.mockRejectedValueOnce(new Error('admin required'))
    await expect(setModeratorSpotlight('member-1', false)).rejects.toThrow('admin required')
    expect(sql).toHaveBeenCalledTimes(1)
  })

  it('returns every account with the same selected member photo and eligibility flag', async () => {
    sqlMock.query.mockResolvedValueOnce([])

    await expect(getAllUsers()).resolves.toEqual([])

    const query = sqlMock.query.mock.calls[0][0] as string
    expect(query).toContain('LEFT JOIN LATERAL')
    expect(query).toContain('primary_photo.url')
    expect(query).toContain('AS has_eligible_photo')
    expect(query).not.toContain('display_profile IS TRUE')
  })
})
