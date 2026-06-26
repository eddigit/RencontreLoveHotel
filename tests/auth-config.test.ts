import { describe, expect, it } from 'vitest'
import { authOptions } from '../lib/auth'

describe('authOptions', () => {
  it('does not expose invalid NextAuth route-only options', () => {
    expect('url' in authOptions).toBe(false)
  })

  it('keeps credentials login enabled for beta access', () => {
    expect(authOptions.providers.some(provider => provider.id === 'credentials')).toBe(true)
  })
})
