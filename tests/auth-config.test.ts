import { beforeEach, describe, expect, it, vi } from 'vitest'

const getOrCreateOAuthUserMock = vi.hoisted(() => vi.fn())
const getUserByEmailMock = vi.hoisted(() => vi.fn())
const getUserByIdMock = vi.hoisted(() => vi.fn())
const verifyUserCredentialsMock = vi.hoisted(() => vi.fn())
const recordAuthEventMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/user-service', () => ({
  getOrCreateOAuthUser: getOrCreateOAuthUserMock,
  getUserByEmail: getUserByEmailMock,
  getUserById: getUserByIdMock,
  verifyUserCredentials: verifyUserCredentialsMock
}))

vi.mock('@/lib/auth-audit', () => ({
  recordAuthEvent: recordAuthEventMock
}))

import { authOptions } from '../lib/auth'

describe('authOptions', () => {
  beforeEach(() => {
    getOrCreateOAuthUserMock.mockReset()
    getUserByEmailMock.mockReset()
    getUserByIdMock.mockReset()
    verifyUserCredentialsMock.mockReset()
    recordAuthEventMock.mockReset()
    recordAuthEventMock.mockResolvedValue(undefined)
  })

  it('does not expose invalid NextAuth route-only options', () => {
    expect('url' in authOptions).toBe(false)
  })

  it('keeps credentials login enabled for beta access', () => {
    expect(authOptions.providers.some(provider => provider.id === 'credentials')).toBe(true)
  })

  it('fails closed for email verification when JWT user lookup misses', async () => {
    getUserByIdMock.mockResolvedValue(null)
    getUserByEmailMock.mockResolvedValue(null)

    const token = await authOptions.callbacks!.jwt!({
      token: { sub: 'token-user', email_verified: false },
      user: { id: 'session-user', email: 'member@example.com' },
      account: null,
      profile: undefined,
      trigger: 'signIn',
      session: undefined
    } as any)

    expect(token.email_verified).toBe(false)
    expect(token.onboardingCompleted).toBe(false)
    expect(token.adultVerified).toBe(false)
  })

  it('keeps the authenticated account id when legacy emails are duplicated', async () => {
    getUserByIdMock.mockResolvedValue({
      id: 'authenticated-user',
      email: 'member@example.com',
      name: 'Compte authentifié',
      role: 'user',
      onboarding_completed: true,
      email_verified: true,
      adult_verified_at: new Date('2026-07-13T10:00:00Z')
    })

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: { id: 'authenticated-user', email: 'member@example.com' },
      account: { provider: 'credentials' },
      profile: undefined,
      trigger: 'signIn',
      session: undefined
    } as any)

    expect(getUserByIdMock).toHaveBeenCalledWith('authenticated-user')
    expect(getUserByEmailMock).not.toHaveBeenCalled()
    expect(token.sub).toBe('authenticated-user')
    expect(token.adultVerified).toBe(true)
  })

  it('assigns the persisted database id to an OAuth user', async () => {
    getOrCreateOAuthUserMock.mockResolvedValue({
      id: 'oauth-database-user',
      email: 'member@example.com'
    })
    const user = { id: 'provider-user', email: 'member@example.com' } as any

    const allowed = await authOptions.callbacks!.signIn!({
      user,
      account: { provider: 'google' },
      profile: undefined,
      email: undefined,
      credentials: undefined
    } as any)

    expect(allowed).toBe(true)
    expect(user.id).toBe('oauth-database-user')
  })

  it('marks an existing banned account as blocked when refreshing its JWT', async () => {
    getUserByIdMock.mockResolvedValue({
      id: 'blocked-user',
      email: 'blocked@example.com',
      name: 'Compte bloqué',
      role: 'user',
      onboarding_completed: true,
      status: 'active',
      is_banned: true
    })

    const token = await authOptions.callbacks!.jwt!({
      token: { sub: 'blocked-user' },
      user: undefined,
      account: null,
      profile: undefined,
      trigger: 'update',
      session: undefined
    } as any)

    expect(token.blocked).toBe(true)
  })

  it('records successful sign-ins with role and provider', async () => {
    await authOptions.callbacks!.signIn!({
      user: {
        id: 'admin-1',
        email: 'Admin@Example.com',
        name: 'Admin',
        role: 'admin'
      },
      account: { provider: 'credentials' },
      profile: undefined,
      email: undefined,
      credentials: undefined
    } as any)

    expect(recordAuthEventMock).toHaveBeenCalledWith({
      userId: 'admin-1',
      email: 'Admin@Example.com',
      role: 'admin',
      provider: 'credentials',
      success: true
    })
  })

  it('records refused credentials without exposing the password', async () => {
    verifyUserCredentialsMock.mockResolvedValue(null)
    const credentialsProvider = authOptions.providers.find(
      provider => provider.id === 'credentials'
    ) as any

    await credentialsProvider.options.authorize(
      { email: 'member@example.com', password: 'secret-value' },
      {}
    )

    expect(recordAuthEventMock).toHaveBeenCalledWith({
      email: 'member@example.com',
      provider: 'credentials',
      success: false
    })
    expect(JSON.stringify(recordAuthEventMock.mock.calls)).not.toContain('secret-value')
  })

  it('refuses creation of an OAuth account without versioned legal consent', async () => {
    getOrCreateOAuthUserMock.mockResolvedValue(null)

    const result = await authOptions.callbacks!.signIn!({
      user: { id: 'oauth-user', email: 'new@example.com', name: 'Nouveau' },
      account: { provider: 'google' },
      profile: undefined,
      email: undefined,
      credentials: undefined
    } as any)

    expect(result).toBe(false)
    expect(recordAuthEventMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'new@example.com',
      provider: 'google',
      success: false
    }))
  })
})
