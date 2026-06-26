import { describe, expect, it } from 'vitest'
import { shouldShowOAuthProviders } from '../lib/oauth-visibility'

describe('shouldShowOAuthProviders', () => {
  it('hides OAuth providers unless explicitly enabled', () => {
    expect(shouldShowOAuthProviders(undefined)).toBe(false)
    expect(shouldShowOAuthProviders('false')).toBe(false)
  })

  it('shows OAuth providers when explicitly enabled', () => {
    expect(shouldShowOAuthProviders('true')).toBe(true)
  })
})
