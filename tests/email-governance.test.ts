import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('email governance', () => {
  it('keeps registration and verification emails in explicit transactional flows', () => {
    const userService = readFileSync('lib/user-service.ts', 'utf8')
    const registration = readFileSync('app/actions.ts', 'utf8')
    const resendRoute = readFileSync('app/api/resend-verification/route.ts', 'utf8')
    const verificationService = readFileSync('lib/verification-email.ts', 'utf8')
    const registrationAdminNotification = readFileSync('lib/registration-admin-notification.ts', 'utf8')

    expect(userService).not.toContain('createTransport')
    expect(userService).not.toContain('sendVerificationEmail')
    expect(registration).toContain('sendVerificationEmail')
    expect(registration).toContain('sendRegistrationAdminNotification')
    expect(resendRoute).toContain('sendVerificationEmail')
    expect(resendRoute).not.toContain('Utilisateur introuvable')
    expect(verificationService).toContain('requestedByUser: true')
    expect(verificationService).toContain('sendMail')
    expect(registrationAdminNotification).toContain('ADMIN_NOTIFICATION_EMAIL')
    expect(registrationAdminNotification).toContain('sendMail')
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
