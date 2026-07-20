import { NextRequest, NextResponse } from 'next/server'
import {
  isCurrentRegistrationConsent,
  type RegistrationConsent
} from '@/lib/legal-policy'
import {
  createOAuthRegistrationConsentToken,
  OAUTH_REGISTRATION_CONSENT_COOKIE,
  OAUTH_REGISTRATION_CONSENT_MAX_AGE_SECONDS
} from '@/lib/oauth-registration-consent'

export async function POST(request: NextRequest) {
  let consent: RegistrationConsent
  try {
    consent = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Requête invalide.' }, { status: 400 })
  }

  if (!isCurrentRegistrationConsent(consent)) {
    return NextResponse.json(
      { success: false, error: 'Les consentements obligatoires sont incomplets ou périmés.' },
      { status: 400 }
    )
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ''
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "Configuration d'inscription indisponible." },
      { status: 500 }
    )
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: OAUTH_REGISTRATION_CONSENT_COOKIE,
    value: createOAuthRegistrationConsentToken(consent, secret),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: OAUTH_REGISTRATION_CONSENT_MAX_AGE_SECONDS
  })
  return response
}
