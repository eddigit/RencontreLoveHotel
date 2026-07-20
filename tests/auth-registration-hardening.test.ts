import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(file, 'utf8')

describe('authentication registration hardening', () => {
  it('mounts the global toaster so credential failures are visible', () => {
    const providers = source('components/providers.tsx')

    expect(providers).toContain("from '@/components/ui/toaster'")
    expect(providers).toContain('<Toaster />')
  })

  it('redirects an unverified credentials session to email verification', () => {
    const login = source('app/login/page.tsx')

    expect(login).toContain('getSession')
    expect(login).toContain("'/verify-email-pending?email='")
    expect(login).toContain('session?.user?.email_verified === false')
  })

  it('does not sign in an email account before its address is verified', () => {
    const register = source('app/register/page.tsx')

    expect(register).not.toContain("signIn('credentials'")
    expect(register).toContain("'/verify-email-pending?email='")
  })

  it('keeps verification resend reachable before authentication', () => {
    const access = source('lib/route-access.ts')

    expect(access).toContain("'/api/resend-verification'")
  })

  it('rate limits verification resends and sends them after the response', () => {
    const resend = source('app/api/resend-verification/route.ts')

    expect(resend).toContain('rateLimit(')
    expect(resend).toContain('after(async () =>')
    expect(resend).toContain('reserveVerificationEmailSend')
  })

  it('never stores an admin-supplied raw verification token', () => {
    const internalRoute = source('app/api/internal-update-verification-token/route.ts')

    expect(internalRoute).not.toContain('SET email_verification_token = $1')
    expect(internalRoute).toContain('createEmailVerificationToken')
    expect(internalRoute).toContain('updateUserVerificationToken')
  })

  it('prepares versioned consent before starting Google registration', () => {
    const register = source('app/register/page.tsx')

    expect(register).toContain("fetch('/api/auth/prepare-google-registration'")
    expect(register).toContain("signIn('google', { callbackUrl: '/discover' })")
    expect(register).toContain('LEGAL_POLICY_VERSIONS')
  })
})
