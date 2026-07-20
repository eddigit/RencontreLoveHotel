import nodemailer from 'nodemailer'
import { canSendEmailForPurpose } from '@/lib/email-policy'

type VerificationEmailInput = {
  email: string
  token: string
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://rencontrelovehotel.com'
  ).replace(/\/$/, '')
}

export async function sendVerificationEmail({
  email,
  token
}: VerificationEmailInput): Promise<void> {
  const decision = canSendEmailForPurpose({
    purpose: 'verification',
    requestedByUser: true
  })
  if (!decision.allowed) {
    throw new Error('Envoi de vérification non autorisé.')
  }

  const requiredConfiguration = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASS
  ]
  if (requiredConfiguration.some(value => !value)) {
    throw new Error('Configuration SMTP incomplète.')
  }

  const verificationLink = `${getBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@rencontrelovehotel.com',
    to: email,
    subject: 'Vérifiez votre adresse email — Love Hotel Rencontre',
    html: `
      <p>Bienvenue sur Love Hotel Rencontre.</p>
      <p>Confirmez votre adresse email pour activer votre compte :</p>
      <p><a href="${verificationLink}">Vérifier mon adresse email</a></p>
      <p>Ce lien personnel expire dans une heure et ne peut être utilisé qu’une fois.</p>
      <p>Si vous n’êtes pas à l’origine de cette inscription, ignorez ce message.</p>
    `
  })
}
