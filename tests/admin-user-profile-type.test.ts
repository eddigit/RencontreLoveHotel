import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'

const requireAdminMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => Object.assign(vi.fn(), { query: vi.fn() }))
const transactionMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({ sql: sqlMock, withTransaction: transactionMock }))
vi.mock('@/lib/server-auth', () => ({ requireAdmin: requireAdminMock }))

import { updateUserByAdmin } from '@/actions/user-actions'

describe('updateUserByAdmin profile type correction', () => {
  beforeEach(() => {
    sqlMock.mockReset()
    sqlMock.query.mockReset()
    requireAdminMock.mockReset().mockResolvedValue({ id: 'admin-1', role: 'admin' })
    transactionMock.mockReset().mockImplementation(async operation => operation({ query: vi.fn() }))
  })

  it('requires an administrator before changing profile identity', async () => {
    requireAdminMock.mockRejectedValueOnce(new Error('Accès administrateur requis'))

    await expect(updateUserByAdmin('member-1', { profileType: 'couple' })).rejects.toThrow('administrateur')
    expect(sqlMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('writes canonical status and gender together without touching preferences or photos', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'member-1', name: 'Alice', email: 'alice@example.test', role: 'user', avatar: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'profile-1' }] })
    transactionMock.mockImplementationOnce(async operation => operation({ query }))

    await updateUserByAdmin('member-1', { profileType: 'single_female' })

    expect(query.mock.calls[0]).toEqual(['SELECT id FROM users WHERE id = $1 FOR UPDATE', ['member-1']])
    expect(query.mock.calls[1][0]).toContain('RETURNING id, name, email, role, avatar')
    expect(query.mock.calls[1][0]).not.toMatch(/password_hash|password_reset_token/i)
    const identityQuery = query.mock.calls[2][0]
    expect(identityQuery).toContain('UPDATE user_profiles')
    expect(identityQuery).toContain('status = $1')
    expect(identityQuery).toContain('gender = $2')
    expect(identityQuery).not.toMatch(/preferences|photos|avatar/i)
    expect(query.mock.calls[2][1]).toEqual(['single_female', 'female', 'member-1'])
  })

  it('clears both identity fields when non renseigné is explicitly chosen', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'profile-1' }] })
    transactionMock.mockImplementationOnce(async operation => operation({ query }))

    await updateUserByAdmin('member-1', { profileType: 'unspecified' })

    expect(query.mock.calls[2][1]).toEqual([null, null, 'member-1'])
  })

  it('does not alter profile identity when no explicit correction is submitted', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
    transactionMock.mockImplementationOnce(async operation => operation({ query }))

    await updateUserByAdmin('member-1', { name: 'Nouveau nom' })

    expect(query).toHaveBeenCalledTimes(2)
  })

  it('rejects unsupported profile types', async () => {
    await expect(updateUserByAdmin('member-1', { profileType: 'photo_guess' as never })).rejects.toThrow('Type de profil invalide')
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('projects only explicit safe account fields when loading a profile for admin editing', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')
    const profileLoader = source.slice(source.indexOf('export async function getUserProfile'), source.indexOf('function buildMatchingProfile'))

    expect(profileLoader).toContain('u.id AS user_id')
    expect(profileLoader).not.toContain('u.*')
    expect(profileLoader).not.toMatch(/password_hash|password_reset_token|email_verification_token/i)
  })
})
