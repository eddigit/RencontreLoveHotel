import { createHash, randomBytes } from 'node:crypto'
import { signPayload, verifySignedPayload } from '@/lib/signed-payload'

const EMAIL_VERIFICATION_MAX_AGE_MS = 60 * 60 * 1000

type EmailVerificationPayload = {
  purpose: 'email-verification'
  email: string
  expiresAt: number
  nonce: string
}

export function createEmailVerificationToken(
  email: string,
  secret: string,
  now = Date.now()
): string {
  return signPayload({
    purpose: 'email-verification',
    email: email.trim().toLowerCase(),
    expiresAt: now + EMAIL_VERIFICATION_MAX_AGE_MS,
    nonce: randomBytes(24).toString('base64url')
  } satisfies EmailVerificationPayload, secret)
}

export function verifyEmailVerificationToken(
  token: string,
  secret: string,
  now = Date.now()
): { email: string } | null {
  const payload = verifySignedPayload<EmailVerificationPayload>(token, secret)
  if (
    payload?.purpose !== 'email-verification' ||
    payload.expiresAt < now ||
    !payload.email
  ) {
    return null
  }
  return { email: payload.email }
}

export function digestEmailVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
