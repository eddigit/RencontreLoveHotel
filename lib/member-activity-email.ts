import nodemailer from 'nodemailer'
import { sql } from '@/lib/db'

export type MemberActivityEmailCategory = 'messages' | 'matches' | 'events'

type MemberActivityEmailInput = {
  recipientUserId: string
  category: MemberActivityEmailCategory
  subject: string
  title: string
  description: string
  ctaLabel: string
  ctaPath: string
}

type ActivityEmailRecipient = {
  id: string
  email: string
  name: string | null
  email_verified: boolean
  status: string | null
  is_banned: boolean | null
  activity_email_consent: boolean | null
  activity_email_decided_at: Date | string | null
  message_email_enabled: boolean | null
  match_email_enabled: boolean | null
  event_email_enabled: boolean | null
  suppressed_email: string | null
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://rencontrelovehotel.com'
  ).replace(/\/$/, '')
}

function internalUrl(path: string) {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl()}${safePath}`
}

function smtpReady() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

function categoryEnabled(
  recipient: ActivityEmailRecipient,
  category: MemberActivityEmailCategory
) {
  if (category === 'messages') return recipient.message_email_enabled === true
  if (category === 'matches') return recipient.match_email_enabled === true
  return recipient.event_email_enabled === true
}

async function recordSend(
  input: MemberActivityEmailInput,
  recipient: ActivityEmailRecipient,
  status: 'sent' | 'error',
  providerMessageId?: string | null,
  errorMessage?: string | null
) {
  try {
    await sql.query(
      `INSERT INTO email_send_logs (
         user_id, email, purpose, status, provider_message_id, error_message, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        recipient.id,
        recipient.email,
        `activity_${input.category}`,
        status,
        providerMessageId || null,
        errorMessage || null,
        JSON.stringify({ category: input.category, ctaPath: input.ctaPath })
      ]
    )
  } catch (error) {
    console.warn('Journalisation e-mail activité indisponible:', error)
  }
}

export async function sendMemberActivityEmail(input: MemberActivityEmailInput) {
  try {
    const recipients = await sql.query<ActivityEmailRecipient[]>(
      `SELECT
         u.id,
         u.email,
         u.name,
         u.email_verified,
         u.status,
         u.is_banned,
         ep.activity_email_consent,
         ep.activity_email_decided_at,
         ep.message_email_enabled,
         ep.match_email_enabled,
         ep.event_email_enabled,
         es.email AS suppressed_email
       FROM users u
       LEFT JOIN email_preferences ep ON ep.user_id = u.id
       LEFT JOIN email_suppression_list es ON LOWER(es.email) = LOWER(u.email)
       WHERE u.id = $1
       LIMIT 1`,
      [input.recipientUserId]
    )
    const recipient = recipients[0]

    if (!recipient) return { sent: false, reason: 'user_not_found' }
    if (!recipient.activity_email_decided_at || recipient.activity_email_consent !== true) {
      return { sent: false, reason: 'consent_missing' }
    }
    if (!categoryEnabled(recipient, input.category)) {
      return { sent: false, reason: 'category_disabled' }
    }
    if (recipient.email_verified !== true) {
      return { sent: false, reason: 'email_unverified' }
    }
    if (recipient.is_banned === true || ![null, 'active'].includes(recipient.status)) {
      return { sent: false, reason: 'account_inactive' }
    }
    if (recipient.suppressed_email) {
      return { sent: false, reason: 'suppressed' }
    }
    if (!smtpReady()) {
      return { sent: false, reason: 'smtp_unavailable' }
    }

    const activityUrl = internalUrl(input.ctaPath)
    const preferencesUrl = internalUrl('/email-preferences')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    try {
      const result = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'Love Hotel Rencontre <no-reply@rencontrelovehotel.com>',
        to: recipient.email,
        subject: input.subject,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#25122d;max-width:600px;margin:auto">
            <p style="color:#c40068;font-weight:700">LOVE HOTEL RENCONTRE</p>
            <h2>${escapeHtml(input.title)}</h2>
            <p>${escapeHtml(input.description)}</p>
            <p><a href="${escapeHtml(activityUrl)}" style="display:inline-block;background:#d90073;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">${escapeHtml(input.ctaLabel)}</a></p>
            <p style="font-size:12px;color:#6f6174">Vous recevez cet e-mail selon vos préférences d’activité. <a href="${escapeHtml(preferencesUrl)}">Modifier mes préférences</a>.</p>
          </div>
        `,
        text: [
          input.title,
          input.description,
          `${input.ctaLabel} : ${activityUrl}`,
          `Modifier mes préférences : ${preferencesUrl}`
        ].join('\n\n')
      })

      await recordSend(input, recipient, 'sent', result.messageId)
      return { sent: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur SMTP inconnue'
      await recordSend(input, recipient, 'error', null, message)
      console.warn(`E-mail activité non envoyé (${input.category}):`, error)
      return { sent: false, reason: 'smtp_error' }
    }
  } catch (error) {
    console.warn(`Préférences e-mail activité indisponibles (${input.category}):`, error)
    return { sent: false, reason: 'database_error' }
  }
}
