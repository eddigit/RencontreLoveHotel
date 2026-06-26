import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('email governance', () => {
  it('disables automatic verification emails from registration and resend flows', () => {
    const userService = readFileSync('lib/user-service.ts', 'utf8')
    const resendRoute = readFileSync('app/api/resend-verification/route.ts', 'utf8')

    expect(userService).not.toContain('createTransport')
    expect(userService).not.toContain('sendVerificationEmail')
    expect(resendRoute).not.toContain('sendMail')
    expect(resendRoute).toContain('Seule une demande explicite de renouvellement de mot de passe')
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
