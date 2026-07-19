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
  isUserAllowedToAuthenticate: (user: { is_banned?: boolean | null; status?: string | null } | null) =>
    Boolean(user) && user?.is_banned !== true && (!user?.status || user.status === 'active'),
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
    expect(token.authBlocked).toBe(true)
    expect(token.sub).toBeUndefined()
  })

  it('reconciles a stale JWT subject from the active database on every session read', async () => {
    getUserByEmailMock.mockResolvedValue({
      id: 'active-database-user',
      email: 'member@example.com',
      name: 'Membre',
      role: 'user',
      avatar: null,
      onboarding_completed: true,
      email_verified: true,
      status: 'active',
      is_banned: false
    })

    const token = await authOptions.callbacks!.jwt!({
      token: { sub: 'obsolete-database-user', email: 'member@example.com' },
      user: undefined,
      account: null,
      profile: undefined,
      trigger: undefined,
      session: undefined
    } as any)

    expect(getUserByEmailMock).toHaveBeenCalledWith('member@example.com')
    expect(token.sub).toBe('active-database-user')
    expect(token.authBlocked).toBe(false)
  })

  it('invalidates an existing JWT when the active database account is banned', async () => {
    getUserByEmailMock.mockResolvedValue({
      id: 'active-database-user',
      email: 'member@example.com',
      status: 'banned',
      is_banned: true
    })

    const token = await authOptions.callbacks!.jwt!({
      token: { sub: 'obsolete-database-user', email: 'member@example.com' },
      user: undefined,
      account: null,
      profile: undefined,
      trigger: undefined,
      session: undefined
    } as any)

    expect(token.authBlocked).toBe(true)
    expect(token.sub).toBeUndefined()
  })

  it('removes the user from blocked sessions', async () => {
    const session = await authOptions.callbacks!.session!({
      session: {
        user: { id: 'stale-user', email: 'member@example.com', name: 'Membre' },
        expires: new Date(Date.now() + 60_000).toISOString()
      },
      token: { sub: 'stale-user', email: 'member@example.com', authBlocked: true }
    } as any)

    expect(session.user).toBeUndefined()
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

  it('refuses OAuth for an inactive existing account', async () => {
    getOrCreateOAuthUserMock.mockResolvedValue({
      id: 'oauth-user',
      email: 'inactive@example.com',
      name: 'Inactif',
      status: 'inactive',
      is_banned: false
    })

    const result = await authOptions.callbacks!.signIn!({
      user: { id: 'oauth-user', email: 'inactive@example.com', name: 'Inactif' },
      account: { provider: 'google' },
      profile: undefined,
      email: undefined,
      credentials: undefined
    } as any)

    expect(result).toBe(false)
    expect(recordAuthEventMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'inactive@example.com',
      provider: 'google',
      success: false
    }))
  })
})
