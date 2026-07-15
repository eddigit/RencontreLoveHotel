import nodemailer from 'nodemailer'
import { sql } from '@/lib/db'
import { OPERATIONAL_CONTACT_EMAIL } from '@/lib/operational-contact'

export const EVENT_RESERVATION_RECIPIENT_EMAIL =
  process.env.EVENT_RESERVATION_RECIPIENT_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  process.env.FEEDBACK_RECIPIENT_EMAIL ||
  OPERATIONAL_CONTACT_EMAIL

type EventReservationAction = 'join' | 'leave'

type NotifyEventReservationInput = {
  eventId: string
  userId: string
  action: EventReservationAction
}

type EventRow = {
  id: string
  title?: string | null
  location?: string | null
  event_date?: string | Date | null
  event_time?: string | null
  venue?: string | null
  experience_type?: string | null
  max_participants?: number | string | null
  participant_count?: number | string | null
}

type UserRow = {
  id: string
  name?: string | null
  email?: string | null
  location?: string | null
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatEventDate(event: EventRow) {
  if (!event.event_date) return 'Date à confirmer'
  const dateValue = event.event_date instanceof Date
    ? event.event_date
    : new Date(String(event.event_date))

  if (Number.isNaN(dateValue.getTime())) return String(event.event_date)

  const date = dateValue.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  const time = event.event_time ? String(event.event_time).slice(0, 5) : ''
  return time ? `${date} à ${time}` : date
}

function smtpReady() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  )
}

async function sendReservationEmail(
  event: EventRow,
  participant: UserRow,
  action: EventReservationAction
) {
  if (!smtpReady()) {
    return false
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://rencontrelovehotel.com'
  const eventUrl = `${baseUrl.replace(/\/$/, '')}/admin/events/${event.id}/subscribers`
  const isJoin = action === 'join'
  const actionLabel = isJoin ? 'Nouvelle réservation événement' : 'Annulation réservation événement'
  const participantLabel = participant.name || participant.email || participant.id

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@rencontrelovehotel.com',
    to: EVENT_RESERVATION_RECIPIENT_EMAIL,
    subject: `${actionLabel} - ${event.title || 'Love Hotel'}`,
    html: `
      <h2>${escapeHtml(actionLabel)}</h2>
      <p><strong>Événement :</strong> ${escapeHtml(event.title || 'Sans titre')}</p>
      <p><strong>Date :</strong> ${escapeHtml(formatEventDate(event))}</p>
      <p><strong>Lieu :</strong> ${escapeHtml(event.location || event.venue || 'Non précisé')}</p>
      <p><strong>Membre :</strong> ${escapeHtml(participantLabel)}</p>
      <p><strong>Email membre :</strong> ${escapeHtml(participant.email || 'Non renseigné')}</p>
      <p><strong>Ville :</strong> ${escapeHtml(participant.location || 'Non renseignée')}</p>
      <p><strong>Participants :</strong> ${escapeHtml(event.participant_count || 0)}${event.max_participants ? ` / ${escapeHtml(event.max_participants)}` : ''}</p>
      <p><a href="${escapeHtml(eventUrl)}">Voir les inscrits dans l'administration</a></p>
    `,
    text: [
      actionLabel,
      `Événement : ${event.title || 'Sans titre'}`,
      `Date : ${formatEventDate(event)}`,
      `Lieu : ${event.location || event.venue || 'Non précisé'}`,
      `Membre : ${participantLabel}`,
      `Email membre : ${participant.email || 'Non renseigné'}`,
      `Ville : ${participant.location || 'Non renseignée'}`,
      `Participants : ${event.participant_count || 0}${event.max_participants ? ` / ${event.max_participants}` : ''}`,
      `Admin : ${eventUrl}`
    ].join('\n')
  })

  return true
}

async function createAdminNotifications(
  event: EventRow,
  participant: UserRow,
  action: EventReservationAction
) {
  const admins = await sql.query<{ id: string }[]>(
    `
      SELECT id
      FROM users
      WHERE role = 'admin'
        AND COALESCE(is_banned, false) = false
        AND COALESCE(status, 'active') = 'active'
      ORDER BY created_at ASC
    `,
    []
  )

  const isJoin = action === 'join'
  const title = isJoin
    ? 'Nouvelle réservation événement'
    : 'Annulation réservation événement'
  const participantLabel = participant.name || participant.email || 'Un membre'

  for (const admin of admins) {
    await sql.query(
      `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          description,
          link,
          image,
          priority,
          category,
          audience,
          metadata,
          created_by,
          read
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, false)
      `,
      [
        admin.id,
        'event_reservation',
        title,
        `${participantLabel} ${isJoin ? "s'est inscrit" : "s'est désinscrit"} : ${event.title || 'événement'}`,
        `/admin/events/${event.id}/subscribers`,
        null,
        'high',
        'events',
        'admin',
        JSON.stringify({
          action,
          eventId: event.id,
          userId: participant.id,
          recipientEmail: EVENT_RESERVATION_RECIPIENT_EMAIL
        }),
        participant.id
      ]
    )
  }

  return admins.length
}

export async function notifyEventReservationAdmins(input: NotifyEventReservationInput) {
  try {
    const [event] = await sql.query<EventRow[]>(
      `
        SELECT
          e.id,
          e.title,
          e.location,
          e.event_date,
          e.event_time,
          e.venue,
          e.experience_type,
          e.max_participants,
          (
            SELECT COUNT(*)
            FROM event_participants ep
            WHERE ep.event_id = e.id
          ) as participant_count
        FROM events e
        WHERE e.id = $1
        LIMIT 1
      `,
      [input.eventId]
    )

    const [participant] = await sql.query<UserRow[]>(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          up.location
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE u.id = $1
        LIMIT 1
      `,
      [input.userId]
    )

    if (!event || !participant) {
      return { success: false, emailSent: false, adminNotificationCount: 0 }
    }

    const adminNotificationCount = await createAdminNotifications(
      event,
      participant,
      input.action
    )
    const emailSent = await sendReservationEmail(event, participant, input.action)

    return { success: true, emailSent, adminNotificationCount }
  } catch (error) {
    console.warn('Notification reservation evenement indisponible:', error)
    return { success: false, emailSent: false, adminNotificationCount: 0 }
  }
}
