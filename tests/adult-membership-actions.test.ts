import { beforeEach, describe, expect, it, vi } from 'vitest'

const createUserMock = vi.hoisted(() => vi.fn())
const getUserByEmailMock = vi.hoisted(() => vi.fn())
const executeQueryMock = vi.hoisted(() => vi.fn())
const requireAuthenticatedUserMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/user-service', () => ({
  createUser: createUserMock,
  getUserByEmail: getUserByEmailMock,
  verifyUserCredentials: vi.fn()
}))

vi.mock('@/lib/onboarding-service', () => ({ saveOnboardingData: vi.fn() }))
vi.mock('@/lib/db', () => ({ executeQuery: executeQueryMock, sql: vi.fn() }))
vi.mock('@/lib/server-auth', () => ({
  requireAuthenticatedUser: requireAuthenticatedUserMock,
  requireCurrentUser: vi.fn(),
  requireSameUserOrAdmin: vi.fn()
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { registerUser } from '@/app/actions'
import { confirmAdultMembership } from '@/actions/adult-membership-actions'
import { ADULT_CONSENT_VERSION } from '@/lib/adult-membership'

describe('adult membership server actions', () => {
  beforeEach(() => {
    createUserMock.mockReset()
    getUserByEmailMock.mockReset()
    executeQueryMock.mockReset()
    requireAuthenticatedUserMock.mockReset()
  })

  it('refuses an underage registration before querying or creating an account', async () => {
    const result = await registerUser(
      'member@example.com',
      'MotDePasse123',
      'Membre',
      false,
      '2010-01-01',
      true,
      true
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('personnes majeures')
    expect(getUserByEmailMock).not.toHaveBeenCalled()
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('passes the validated birth date and consent version to account creation', async () => {
    getUserByEmailMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ id: 'member-id' })

    const result = await registerUser(
      ' Member@Example.com ',
      'MotDePasse123',
      'Membre',
      false,
      '1990-05-12',
      true,
      true
    )

    expect(result.success).toBe(true)
    expect(createUserMock).toHaveBeenCalledWith(
      'member@example.com',
      'MotDePasse123',
      'Membre',
      'user',
      false,
      '1990-05-12',
      ADULT_CONSENT_VERSION
    )
  })

  it('records an existing member declaration only for the authenticated account', async () => {
    requireAuthenticatedUserMock.mockResolvedValue({ id: 'member-id' })
    executeQueryMock.mockResolvedValue([])

    const result = await confirmAdultMembership({
      dateOfBirth: '1990-05-12',
      adultConsent: true,
      termsAccepted: true
    })

    expect(result).toEqual({ success: true })
    expect(executeQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1'),
      ['member-id', '1990-05-12', ADULT_CONSENT_VERSION]
    )
  })
})
