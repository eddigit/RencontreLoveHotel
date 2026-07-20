import { after, NextRequest, NextResponse } from "next/server";
import {
  finalizeVerificationEmailSend,
  getUserByEmail,
  isUserAllowedToAuthenticate,
  reserveVerificationEmailSend,
  updateUserVerificationToken
} from "@/lib/user-service";
import { createEmailVerificationToken } from '@/lib/email-verification-token'
import { sendVerificationEmail } from '@/lib/verification-email'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const genericResponse = {
    success: true,
    message: 'Si cette adresse correspond à un compte à vérifier, un nouveau lien vient d’être envoyé.'
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const ipLimit = rateLimit(`verification-email:${ip}`, 10, 15 * 60 * 1000)
  if (!ipLimit.success) {
    return NextResponse.json(genericResponse, {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil((ipLimit.resetTime - Date.now()) / 1000)))
      }
    })
  }

  let email: unknown
  try {
    email = (await req.json()).email
  } catch {
    return NextResponse.json({ success: false, error: 'Requête invalide.' }, { status: 400 })
  }
  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ success: false, error: "Email manquant." }, { status: 400 });
  }
  const user = await getUserByEmail(email);
  if (!user || user.email_verified || !isUserAllowedToAuthenticate(user)) {
    return NextResponse.json(genericResponse);
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ''
  if (!secret) {
    console.error("Configuration de vérification d'email indisponible.")
    return NextResponse.json(genericResponse)
  }

  after(async () => {
    let logId: string | null = null
    try {
      logId = await reserveVerificationEmailSend(user.id, user.email)
      if (!logId) return

      const token = createEmailVerificationToken(user.email, secret)
      const updated = await updateUserVerificationToken(user.id, token)
      if (!updated) {
        await finalizeVerificationEmailSend(logId, 'error')
        return
      }
      await sendVerificationEmail({ email: user.email, token })
      await finalizeVerificationEmailSend(logId, 'sent')
    } catch {
      if (logId) {
        await finalizeVerificationEmailSend(logId, 'error').catch(() => undefined)
      }
      console.error("Échec du renvoi de l'email de vérification.")
    }
  })
  return NextResponse.json(genericResponse)
}
