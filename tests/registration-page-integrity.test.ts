import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(
  path.join(process.cwd(), 'app/register/page.tsx'),
  'utf8'
)

describe('registration page integrity', () => {
  it('shows registration failures instead of logging them silently', () => {
    expect(source).toContain("const [error, setError]")
    expect(source).toContain("setError(result.error")
    expect(source).toContain("role='alert'")
  })

  it('prevents duplicate submissions while registration is running', () => {
    expect(source).toContain("const [isSubmitting, setIsSubmitting]")
    expect(source).toContain('disabled={isSubmitting ||')
    expect(source).toContain("Inscription en cours...")
  })

  it('offers the same Google entry point as the login page', () => {
    expect(source).toContain('shouldShowOAuthProviders')
    expect(source).toContain("signIn('google', { callbackUrl: '/discover' })")
    expect(source).toContain("fetch('/api/auth/prepare-google-registration'")
    expect(source).toContain('Continuer avec Google')
  })
})
