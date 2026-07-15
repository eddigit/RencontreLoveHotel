import { describe, expect, it } from 'vitest'
import {
  choosePrimaryDuplicateAccount,
  scoreDuplicateAccount
} from '@/lib/duplicate-user-reconciliation'

const baseAccount = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'user',
  hasPassword: false,
  onboardingCompleted: false,
  hasProfile: false,
  hasAvatar: false,
  photoCount: 0,
  conversationCount: 0,
  messageCount: 0,
  matchCount: 0,
  eventCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z'
}

describe('duplicate user reconciliation', () => {
  it('prioritizes an admin account over ordinary activity', () => {
    const admin = { ...baseAccount, id: 'admin', role: 'admin' }
    const activeMember = {
      ...baseAccount,
      id: 'member',
      hasPassword: true,
      onboardingCompleted: true,
      messageCount: 20,
      matchCount: 100
    }

    expect(scoreDuplicateAccount(admin)).toBeGreaterThan(
      scoreDuplicateAccount(activeMember)
    )
  })

  it('keeps the account carrying conversations, messages and photos', () => {
    const empty = { ...baseAccount, id: 'empty' }
    const active = {
      ...baseAccount,
      id: 'active',
      hasPassword: true,
      conversationCount: 3,
      messageCount: 4,
      photoCount: 2
    }

    expect(choosePrimaryDuplicateAccount([empty, active]).id).toBe('active')
  })

  it('uses the oldest account then its id as deterministic tie breakers', () => {
    const newer = {
      ...baseAccount,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      createdAt: '2026-02-01T00:00:00.000Z'
    }
    const oldestB = {
      ...baseAccount,
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    }
    const oldestA = {
      ...baseAccount,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    }

    expect(choosePrimaryDuplicateAccount([newer, oldestB, oldestA]).id)
      .toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  })

  it('refuses to choose from fewer than two accounts', () => {
    expect(() => choosePrimaryDuplicateAccount([baseAccount]))
      .toThrow('deux comptes')
  })
})
