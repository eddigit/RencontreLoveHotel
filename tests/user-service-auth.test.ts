import { hash } from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  executeQuery: vi.fn()
}))

vi.mock('@/actions/user-actions', () => ({
  getOption: vi.fn()
}))

import { executeQuery } from '@/lib/db'
import { getOrCreateOAuthUser, verifyUserCredentials } from '@/lib/user-service'

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

  it('checks every legacy duplicate account and returns the one matching the password', async () => {
    const firstHash = await hash('PremierMotDePasse', 10)
    const secondHash = await hash('SecondMotDePasse', 10)

    ;(executeQuery as any).mockResolvedValueOnce([
      {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'MEMBER@example.com',
        password_hash: firstHash,
        name: 'Ancien compte',
        role: 'user',
        onboarding_completed: true
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'member@example.com',
        password_hash: secondHash,
        name: 'Compte actif',
        role: 'user',
        onboarding_completed: true
      }
    ])

    const user = await verifyUserCredentials('member@example.com', 'SecondMotDePasse')

    expect(user?.id).toBe('22222222-2222-4222-8222-222222222222')
  })

  it('normalizes OAuth emails and reuses a case-insensitive existing account', async () => {
    ;(executeQuery as any).mockResolvedValueOnce([
      {
        id: '33333333-3333-4333-8333-333333333333',
        email: 'member@example.com',
        name: 'Membre OAuth',
        role: 'user',
        onboarding_completed: true
      }
    ])

    const user = await getOrCreateOAuthUser({
      email: ' Member@Example.com ',
      name: 'Membre OAuth'
    })

    expect(user?.id).toBe('33333333-3333-4333-8333-333333333333')
    expect(executeQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE lower(email) = $1'),
      ['member@example.com']
    )
  })

  it('refuses credentials for a banned legacy account even with a valid password', async () => {
    const passwordHash = await hash('MotDePasseValide', 10)
    ;(executeQuery as any).mockResolvedValueOnce([{
      id: '44444444-4444-4444-8444-444444444444',
      email: 'blocked@example.com',
      password_hash: passwordHash,
      name: 'Compte bloqué',
      role: 'user',
      onboarding_completed: true,
      status: 'active',
      is_banned: true
    }])

    await expect(
      verifyUserCredentials('blocked@example.com', 'MotDePasseValide')
    ).resolves.toBeNull()
  })
})
