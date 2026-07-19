import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUserByResetTokenMock = vi.hoisted(() => vi.fn())
const updateUserPasswordMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/user-service', () => ({
  getUserByResetToken: getUserByResetTokenMock,
  updateUserPassword: updateUserPasswordMock
}))

import { POST } from '@/app/api/account/reset-password/route'

describe('password reset validation', () => {
  beforeEach(() => {
    getUserByResetTokenMock.mockReset()
    updateUserPasswordMock.mockReset()
  })

  it('rejects a weak password before looking up the reset token', async () => {
    getUserByResetTokenMock.mockResolvedValue({ id: 'user-1' })

    const response = await POST(new Request('https://example.test/api/account/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token', password: 'weak' })
    }) as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Le mot de passe doit contenir au moins 8 caractères')
    expect(getUserByResetTokenMock).not.toHaveBeenCalled()
    expect(updateUserPasswordMock).not.toHaveBeenCalled()
  })
})
