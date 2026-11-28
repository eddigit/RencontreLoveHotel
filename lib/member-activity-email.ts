import nodemailer from 'nodemailer'
import { sql } from '@/lib/db'
import { canSendEmailForPurpose, type EmailPurpose } from '@/lib/email-policy'

type ActivityEmailPurpose = Extract<EmailPurpose, 'message_alert' | 'match_alert' | 'event_alert'>

type MemberActivityEmailInput = {
  recipientId: string
  purpose: ActivityEmailPurpose
  notificationKey: string
  subject: string
  text: string
  path: string
}

type RecipientRow = {
  email?: string | null
  email_verified?: boolean | null
  status?: string | null
  is_banned?: boolean | null
  opted_out_at?: string | Date | null
  activity_email_consent?: boolean | null
  message_email_enabled?: boolean | null
  match_email_enabled?: boolean | null
  event_email_enabled?: boolean | null
  suppressed_email?: string | null
}

function smtpReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://rencontrelovehotel.com'
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Optional activity mail only. It never includes message content, sender
 * identity, or a match counterpart, because inbox previews are not private.
 * A unique delivery claim prevents a retry or duplicate request from mailing
 * the same activity twice. All outcomes are best effort.
 */
export async function sendMemberActivityEmail(input: MemberActivityEmailInput) {
  try {
    const recipients = await sql.query<RecipientRow[]>(
      `SELECT u.email, u.email_verified, u.status, u.is_banned, ep.opted_out_at,
              ep.activity_email_consent, ep.message_email_enabled,
              ep.match_email_enabled, ep.event_email_enabled,
              es.email AS suppressed_email
       FROM users u
       LEFT JOIN email_preferences ep ON ep.user_id = u.id
       LEFT JOIN email_suppression_list es ON lower(es.email) = lower(u.email)
       WHERE u.id = $1
       LIMIT 1`,
      [input.recipientId]
    )
    const recipient = recipients[0]
    const decision = canSendEmailForPurpose({
      purpose: input.purpose,
      requestedByUser: false,
      user: { status: recipient?.status, isBanned: recipient?.is_banned },
      preference: {
        optedOutAt: recipient?.opted_out_at,
        activityEmailConsent: recipient?.activity_email_consent,
        messageEmailEnabled: recipient?.message_email_enabled,
        matchEmailEnabled: recipient?.match_email_enabled,
        eventEmailEnabled: recipient?.event_email_enabled
      },
      suppressed: Boolean(recipient?.suppressed_email)
    })
    if (!recipient?.email || recipient.email_verified !== true || !decision.allowed) {
      return { sent: false, reason: recipient?.email_verified === false ? 'email_unverified' : decision.reason }
    }

    const claims = await sql.query<{ id: string }[]>(
      `INSERT INTO member_activity_email_deliveries (user_id, purpose, notification_key, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (user_id, purpose, notification_key) DO NOTHING
       RETURNING id`,
      [input.recipientId, input.purpose, input.notificationKey]
    )
    const claim = claims[0]
    if (!claim) return { sent: false, reason: 'duplicate' as const }

    if (!smtpReady()) {
      await sql.query(`UPDATE member_activity_email_deliveries SET status = 'skipped', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [claim.id])
      return { sent: false, reason: 'smtp_unavailable' as const }
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 8_000
    })
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@rencontrelovehotel.com',
      to: recipient.email,
      subject: input.subject,
      text: `${input.text}\n\nOuvrir Joug : ${appUrl(input.path)}`
    })
    await sql.query(`UPDATE member_activity_email_deliveries SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [claim.id])
    return { sent: true }
  } catch {
    // The underlying action has already persisted its message/match/event.
    return { sent: false, reason: 'delivery_failed' as const }
  }
}
