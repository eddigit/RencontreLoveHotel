import { beforeEach, describe, expect, it, vi } from 'vitest'

const getOrCreateOAuthUserMock = vi.hoisted(() => vi.fn())
const getUserByEmailMock = vi.hoisted(() => vi.fn())
const getUserByIdMock = vi.hoisted(() => vi.fn())
const verifyUserCredentialsMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/user-service', () => ({
  getOrCreateOAuthUser: getOrCreateOAuthUserMock,
  getUserByEmail: getUserByEmailMock,
  getUserById: getUserByIdMock,
  verifyUserCredentials: verifyUserCredentialsMock
}))

import { authOptions } from '../lib/auth'

describe('authOptions', () => {
  beforeEach(() => {
    getOrCreateOAuthUserMock.mockReset()
    getUserByEmailMock.mockReset()
    getUserByIdMock.mockReset()
    verifyUserCredentialsMock.mockReset()
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
  })
})
