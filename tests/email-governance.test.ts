import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('email governance', () => {
  it('allows only explicit transactional verification emails from registration and resend flows', () => {
    const userService = readFileSync('lib/user-service.ts', 'utf8')
    const registration = readFileSync('app/actions.ts', 'utf8')
    const resendRoute = readFileSync('app/api/resend-verification/route.ts', 'utf8')
    const verificationService = readFileSync('lib/verification-email.ts', 'utf8')

    expect(userService).not.toContain('createTransport')
    expect(userService).not.toContain('sendVerificationEmail')
    expect(registration).toContain('sendVerificationEmail')
    expect(resendRoute).toContain('sendVerificationEmail')
    expect(resendRoute).not.toContain('Utilisateur introuvable')
    expect(verificationService).toContain('requestedByUser: true')
    expect(verificationService).toContain('sendMail')
  })

  it('keeps explicit password reset email as the allowed transactional flow', () => {
    const resetRoute = readFileSync('app/api/account/request-password-reset/route.ts', 'utf8')

    expect(resetRoute).toContain('updateUserResetToken')
    expect(resetRoute).toContain('canSendEmailForPurpose')
    expect(resetRoute).toContain("purpose: 'password_reset'")
    expect(resetRoute).toContain('requestedByUser: true')
    expect(resetRoute).toContain('sendMail')
    expect(resetRoute).toContain('Password reset email sent')
  })
})
