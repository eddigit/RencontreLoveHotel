import { hash } from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  executeQuery: vi.fn()
}))

vi.mock('@/actions/user-actions', () => ({
  getOption: vi.fn()
}))

import { executeQuery } from '@/lib/db'
import { createUser, getOrCreateOAuthUser, verifyUserCredentials } from '@/lib/user-service'

const currentConsent = {
  adult: true,
  terms: true,
  antiSolicitation: true,
  versions: {
    terms: '2026-07-15',
    privacy: '2026-07-15',
    antiSolicitation: '2026-07-15'
  }
} as const

describe('user-service auth', () => {
  beforeEach(() => {
    ;(executeQuery as any).mockReset()
  })

  it('normalizes email case before verifying credentials', async () => {
    const passwordHash = await hash('Azerty123*', 10)

    ;(executeQuery as any).mockResolvedValueOnce([
      {
        id: '41f06015-6fa0-4ea3-8ef5-bfb2f65c7242',
        email: 'saddjaadomarjee@gmail.com',
        password_hash: passwordHash,
        name: 'Saddjaad Omarjee',
        role: 'admin',
        avatar: null,
        onboarding_completed: true,
        email_verified: true,
        status: 'active',
        is_banned: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ])

    const user = await verifyUserCredentials('Saddjaadomarjee@gmail.com', 'Azerty123*')

    expect(user?.email).toBe('saddjaadomarjee@gmail.com')
    expect(user?.role).toBe('admin')
    expect(executeQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE lower(email) = $1'),
      ['saddjaadomarjee@gmail.com']
    )
  })

  it.each([
    { status: 'banned', is_banned: true },
    { status: 'inactive', is_banned: false }
  ])('refuses valid credentials for a blocked account: $status', async blockedState => {
    const passwordHash = await hash('Azerty123*', 10)

    ;(executeQuery as any).mockResolvedValueOnce([{
      id: '41f06015-6fa0-4ea3-8ef5-bfb2f65c7242',
      email: 'blocked@example.com',
      password_hash: passwordHash,
      name: 'Compte bloqué',
      role: 'user',
      avatar: null,
      onboarding_completed: true,
      email_verified: true,
      ...blockedState,
      created_at: new Date(),
      updated_at: new Date()
    }])

    const user = await verifyUserCredentials('blocked@example.com', 'Azerty123*')

    expect(user).toBeNull()
  })

  it('creates password accounts as unverified with a non-reusable token digest', async () => {
    ;(executeQuery as any).mockResolvedValueOnce([{
      id: 'new-user',
      email: 'new@example.com',
      name: 'Nouveau membre',
      role: 'user'
    }])

    await createUser(
      'New@Example.com',
      'Azerty123*',
      'Nouveau membre',
      'user',
      currentConsent,
      'raw-verification-token'
    )

    const [, params] = (executeQuery as any).mock.calls[0]
    expect(params[1]).toBe('new@example.com')
    expect(params[5]).toBe(false)
    expect(params[6]).not.toBe('raw-verification-token')
    expect(params[6]).toMatch(/^[a-f0-9]{64}$/)
  })

  it('creates a Google member only when current legal consent is supplied', async () => {
    ;(executeQuery as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'oauth-user',
        email: 'oauth@example.com',
        name: 'OAuth membre',
        role: 'user',
        email_verified: true
      }])

    const user = await getOrCreateOAuthUser({
      email: 'OAuth@Example.com',
      name: 'OAuth membre',
      avatar: 'https://example.com/avatar.jpg',
      consent: currentConsent,
      emailVerifiedByProvider: true
    })

    expect(user?.id).toBe('oauth-user')
    const [query, params] = (executeQuery as any).mock.calls[1]
    expect(query).toContain('INSERT INTO legal_acceptances')
    expect(query).toContain('ON CONFLICT (email)')
    expect(params).toEqual(expect.arrayContaining([
      'oauth@example.com',
      '2026-07-15'
    ]))
  })

  it('never attaches an OAuth provider that did not verify the email to an existing account', async () => {
    ;(executeQuery as any).mockResolvedValueOnce([{
      id: 'existing-user',
      email: 'member@example.com',
      name: 'Membre',
      role: 'user',
      email_verified: true,
      status: 'active',
      is_banned: false
    }])

    const user = await getOrCreateOAuthUser({
      email: 'member@example.com',
      emailVerifiedByProvider: false
    })

    expect(user).toBeNull()
  })
})
