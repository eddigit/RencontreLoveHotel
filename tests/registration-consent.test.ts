import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createUser, sendVerificationEmail } = vi.hoisted(() => ({
  createUser: vi.fn(),
  sendVerificationEmail: vi.fn()
}))

vi.mock('@/lib/user-service', () => ({
  createUser,
  verifyUserCredentials: vi.fn()
}))

vi.mock('@/lib/email-verification-token', () => ({
  createEmailVerificationToken: vi.fn(() => 'signed-verification-token')
}))

vi.mock('@/lib/verification-email', () => ({
  sendVerificationEmail
}))

vi.mock('@/lib/onboarding-service', () => ({ saveOnboardingData: vi.fn() }))
vi.mock('@/lib/db', () => ({ executeQuery: vi.fn(), sql: vi.fn() }))

import { registerUser } from '@/app/actions'

const LEGAL_POLICY_VERSIONS = {
  terms: '2026-07-15',
  privacy: '2026-07-15',
  antiSolicitation: '2026-07-15'
} as const

describe('registration legal consent', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'
    createUser.mockReset()
    createUser.mockResolvedValue({ id: 'user-1' })
    sendVerificationEmail.mockReset()
    sendVerificationEmail.mockResolvedValue(undefined)
  })

  it('rejects registration when one commitment is missing', async () => {
    const result = await registerUser('member@example.test', 'Secret123', 'Membre', {
      adult: true,
      terms: true,
      antiSolicitation: false,
      versions: LEGAL_POLICY_VERSIONS
    })

    expect(result).toEqual({
      success: false,
      error: 'Vous devez confirmer votre majorité et accepter les règles obligatoires.'
    })
    expect(createUser).not.toHaveBeenCalled()
  })

  it('rejects stale legal document versions', async () => {
    const result = await registerUser('member@example.test', 'Secret123', 'Membre', {
      adult: true,
      terms: true,
      antiSolicitation: true,
      versions: { ...LEGAL_POLICY_VERSIONS, antiSolicitation: 'ancienne-version' }
    })

    expect(result.success).toBe(false)
    expect(createUser).not.toHaveBeenCalled()
  })

  it('passes complete versioned consent to user creation', async () => {
    await registerUser('member@example.test', 'Secret123', 'Membre', {
      adult: true,
      terms: true,
      antiSolicitation: true,
      versions: LEGAL_POLICY_VERSIONS
    })

    expect(createUser).toHaveBeenCalledWith(
      'member@example.test',
      'Secret123',
      'Membre',
      'user',
      expect.objectContaining({
        adult: true,
        terms: true,
        antiSolicitation: true,
        versions: LEGAL_POLICY_VERSIONS
      }),
      'signed-verification-token'
    )
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      email: 'member@example.test',
      token: 'signed-verification-token'
    })
  })

  it('explains that an account already exists for a duplicate email', async () => {
    createUser.mockRejectedValueOnce(
      Object.assign(new Error('duplicate email'), {
        code: '23505',
        constraint: 'users_email_key'
      })
    )

    const result = await registerUser('member@example.test', 'Secret123', 'Membre', {
      adult: true,
      terms: true,
      antiSolicitation: true,
      versions: LEGAL_POLICY_VERSIONS
    })

    expect(result).toEqual({
      success: false,
      error: 'Un compte existe déjà avec cette adresse email. Connectez-vous ou réinitialisez votre mot de passe.'
    })
  })

  it.each([
    {
      label: 'invalid email',
      email: 'not-an-email',
      password: 'Secret123',
      name: 'Membre',
      expectedError: 'Adresse email invalide'
    },
    {
      label: 'weak password',
      email: 'member@example.test',
      password: 'weak',
      name: 'Membre',
      expectedError: 'Le mot de passe doit contenir au moins 8 caractères'
    },
    {
      label: 'short name',
      email: 'member@example.test',
      password: 'Secret123',
      name: 'M',
      expectedError: 'Le nom doit contenir au moins 2 caractères'
    }
  ])('rejects server-side registration data: $label', async input => {
    const result = await registerUser(input.email, input.password, input.name, {
      adult: true,
      terms: true,
      antiSolicitation: true,
      versions: LEGAL_POLICY_VERSIONS
    })

    expect(result).toEqual({ success: false, error: input.expectedError })
    expect(createUser).not.toHaveBeenCalled()
  })
})
