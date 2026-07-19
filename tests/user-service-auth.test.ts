import { hash } from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  executeQuery: vi.fn()
}))

vi.mock('@/actions/user-actions', () => ({
  getOption: vi.fn()
}))

import { executeQuery } from '@/lib/db'
import { verifyUserCredentials } from '@/lib/user-service'

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
})
