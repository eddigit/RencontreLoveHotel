import nodemailer from 'nodemailer'
import { OPERATIONAL_CONTACT_EMAIL } from '@/lib/operational-contact'

export type RegistrationAdminNotificationInput = {
  userId: string
  email: string
  name: string
}

function getRegistrationNotificationRecipient() {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.CONCIERGERIE_RECIPIENT_EMAIL ||
    process.env.FEEDBACK_RECIPIENT_EMAIL ||
    OPERATIONAL_CONTACT_EMAIL
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendRegistrationAdminNotification({
  userId,
  email,
  name
}: RegistrationAdminNotificationInput): Promise<void> {
  const recipient = getRegistrationNotificationRecipient()
  const requiredConfiguration = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASS,
    recipient
  ]
  if (requiredConfiguration.some(value => !value)) {
    throw new Error("Configuration email opérateur incomplète.")
  }

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
    to: recipient,
    subject: 'Nouvelle inscription — Love Hotel Rencontre',
    html: `
      <p>Une nouvelle adhérente vient de créer un compte.</p>
      <ul>
        <li><strong>Nom :</strong> ${escapeHtml(name)}</li>
        <li><strong>Email :</strong> ${escapeHtml(email)}</li>
        <li><strong>ID :</strong> ${escapeHtml(userId)}</li>
      </ul>
      <p>Le profil apparaîtra dans les profils visibles après vérification email, onboarding et activation de l’affichage public.</p>
    `
  })
}
