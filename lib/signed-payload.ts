import { createHmac, timingSafeEqual } from 'node:crypto'

function signatureFor(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function signPayload(payload: unknown, secret: string): string {
  if (!secret) throw new Error('Secret de signature manquant.')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${signatureFor(encodedPayload, secret)}`
}

export function verifySignedPayload<T>(token: string, secret: string): T | null {
  if (!token || !secret) return null
  const [encodedPayload, suppliedSignature, extra] = token.split('.')
  if (!encodedPayload || !suppliedSignature || extra) return null

  const expectedSignature = signatureFor(encodedPayload, secret)
  const supplied = Buffer.from(suppliedSignature)
  const expected = Buffer.from(expectedSignature)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}
