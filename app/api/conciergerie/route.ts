import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import nodemailer from 'nodemailer'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

const CONCIERGERIE_RECIPIENT_EMAIL =
  process.env.CONCIERGERIE_RECIPIENT_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  process.env.FEEDBACK_RECIPIENT_EMAIL ||
  'loolyyb@gmail.com'

type ResponsePreference = 'chat' | 'email'

type ConciergeriePayload = {
  nom?: unknown
  email?: unknown
  phone?: unknown
  besoin?: unknown
  budget?: unknown
  requestType?: unknown
  request_type?: unknown
  responsePreference?: unknown
  response_preference?: unknown
  venuePreference?: unknown
  venue_preference?: unknown
  desiredDate?: unknown
  desired_date?: unknown
  partySize?: unknown
  party_size?: unknown
  mood?: unknown
}

type NormalizedConciergerieRequest = {
  nom: string
  email: string
  phone: string
  besoin: string
  budget: string
  requestType: string
  requestTypeLabel: string
  responsePreference: ResponsePreference
  responsePreferenceLabel: string
  venuePreference: string
  desiredDate: string
  partySize: string
  mood: string
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  custom_evening: 'Soirée sur mesure',
  weekend: 'Week-end particulier',
  love_room: 'Love Room et chambre préparée',
  limousine: 'Limousine / arrivée scénarisée',
  restaurant: 'Restaurant ou partenaire sur mesure',
  open_curtains: 'Rideaux ouverts',
  jacuzzi: 'Apéro jacuzzi privé',
  libertine_event: 'Événement libertin spécifique',
  other: 'Autre demande'
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength)
}

function normalizePayload(
  payload: ConciergeriePayload,
  sessionUser?: { name?: string | null; email?: string | null }
): NormalizedConciergerieRequest {
  const nom = cleanText(payload.nom || sessionUser?.name, 120)
  const email = cleanText(payload.email || sessionUser?.email, 180).toLowerCase()
  const phone = cleanText(payload.phone, 80)
  const besoin = cleanText(payload.besoin, 3000)
  const budget = cleanText(payload.budget, 120)
  const requestTypeCandidate = cleanText(
    payload.requestType || payload.request_type || 'custom_evening',
    80
  )
  const requestType = REQUEST_TYPE_LABELS[requestTypeCandidate]
    ? requestTypeCandidate
    : 'other'
  const responsePreference: ResponsePreference = 'email'
  const venuePreference = cleanText(
    payload.venuePreference || payload.venue_preference,
    160
  )
  const desiredDate = cleanText(
    payload.desiredDate || payload.desired_date,
    160
  )
  const partySize = cleanText(payload.partySize || payload.party_size, 160)
  const mood = cleanText(payload.mood, 120)

  if (nom.length < 2) {
    throw new Error('Merci de renseigner votre nom ou pseudo.')
  }

  if (!email.includes('@')) {
    throw new Error('Merci de renseigner une adresse email valide.')
  }

  if (besoin.length < 12) {
    throw new Error('Merci de préciser votre demande de conciergerie.')
  }

  return {
    nom,
    email,
    phone,
    besoin,
    budget,
    requestType,
    requestTypeLabel: REQUEST_TYPE_LABELS[requestType],
    responsePreference,
    responsePreferenceLabel: 'Réponse par email',
    venuePreference,
    desiredDate,
    partySize,
    mood
  }
}

function formatOptionalRequestLine(label: string, value: string) {
  return value ? `${label} : ${value}` : null
}

async function ensureConciergerieSchema() {
  await sql.query(
    `
      CREATE TABLE IF NOT EXISTS conciergerie_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        nom VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        request_type VARCHAR(100) NOT NULL DEFAULT 'custom_evening',
        response_preference VARCHAR(20) NOT NULL DEFAULT 'email',
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        besoin TEXT NOT NULL,
        budget VARCHAR(100),
        email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        admin_notified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `,
    []
  )

  await sql.query(
    `
      ALTER TABLE conciergerie_requests
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS phone VARCHAR(100),
        ADD COLUMN IF NOT EXISTS request_type VARCHAR(100) NOT NULL DEFAULT 'custom_evening',
        ADD COLUMN IF NOT EXISTS response_preference VARCHAR(20) NOT NULL DEFAULT 'email',
        ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    `,
    []
  )

  await sql.query(
    `
      CREATE INDEX IF NOT EXISTS idx_conciergerie_requests_created
      ON conciergerie_requests(created_at DESC)
    `,
    []
  )
}

async function findConciergerieAdmin(requesterId?: string | null) {
  const directRows = await sql.query<{ id: string; email: string; role: string }[]>(
    `
      SELECT id, email, role
      FROM users
      WHERE lower(email) = lower($1)
        AND COALESCE(is_banned, false) = false
        AND COALESCE(status, 'active') = 'active'
      LIMIT 1
    `,
    [CONCIERGERIE_RECIPIENT_EMAIL]
  )
  const directAdmin = directRows.find(
    user => user.id !== requesterId && user.role === 'admin'
  )

  if (directAdmin) return directAdmin

  const fallbackRows = await sql.query<{ id: string; email: string; role: string }[]>(
    `
      SELECT id, email, role
      FROM users
      WHERE role = 'admin'
        AND COALESCE(is_banned, false) = false
        AND COALESCE(status, 'active') = 'active'
        AND id != COALESCE($1::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      ORDER BY lower(email) = lower($2) DESC, created_at ASC
      LIMIT 1
    `,
    [requesterId || null, CONCIERGERIE_RECIPIENT_EMAIL]
  )

  return fallbackRows[0] || null
}

function buildConciergerieMessage(
  request: NormalizedConciergerieRequest,
  requestId: string
) {
  return [
    'Nouvelle demande de conciergerie érotique',
    '',
    `Référence : ${requestId}`,
    `Membre : ${request.nom}`,
    `Email : ${request.email}`,
    request.phone ? `Téléphone : ${request.phone}` : null,
    `Type : ${request.requestTypeLabel}`,
    `Réponse souhaitée : ${request.responsePreferenceLabel}`,
    formatOptionalRequestLine('Établissement souhaité', request.venuePreference),
    formatOptionalRequestLine('Date ou période souhaitée', request.desiredDate),
    formatOptionalRequestLine('Nombre de personnes ou couples', request.partySize),
    formatOptionalRequestLine('Ambiance recherchée', request.mood),
    request.budget ? `Budget : ${request.budget}` : 'Budget : non précisé',
    '',
    request.besoin
  ]
    .filter(Boolean)
    .join('\n')
}

async function createConciergerieConversation({
  request,
  requestId,
  requesterId
}: {
  request: NormalizedConciergerieRequest
  requestId: string
  requesterId?: string | null
}) {
  if (request.responsePreference !== 'chat' || !requesterId) {
    return null
  }

  const admin = await findConciergerieAdmin(requesterId)
  if (!admin?.id || admin.id === requesterId) {
    return null
  }

  const existingRows = await sql.query<{ id: string }[]>(
    `
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp_user
        ON cp_user.conversation_id = c.id
       AND cp_user.user_id = $1
      JOIN conversation_participants cp_admin
        ON cp_admin.conversation_id = c.id
       AND cp_admin.user_id = $2
      LIMIT 1
    `,
    [requesterId, admin.id]
  )

  let conversationId = existingRows[0]?.id
  if (!conversationId) {
    const [conversation] = await sql.query<{ id: string }[]>(
      `INSERT INTO conversations DEFAULT VALUES RETURNING id`,
      []
    )
    conversationId = conversation.id

    await sql.query(
      `
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES ($1, $2), ($1, $3)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [conversationId, requesterId, admin.id]
    )
  }

  await sql.query(
    `
      INSERT INTO messages (conversation_id, sender_id, content, is_read)
      VALUES ($1, $2, $3, false)
    `,
    [conversationId, requesterId, buildConciergerieMessage(request, requestId)]
  )

  await sql.query(
    `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [conversationId]
  )

  return conversationId
}

function smtpReady() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  )
}

async function sendConciergerieEmail(
  request: NormalizedConciergerieRequest,
  requestId: string,
  conversationId?: string | null
) {
  if (!smtpReady()) {
    console.warn('SMTP non configuré: demande conciergerie stockée sans email.')
    return false
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://rencontrelovehotel.com'
  const adminUrl = `${baseUrl.replace(/\/$/, '')}/admin/conciergerie`
  const conversationUrl = conversationId
    ? `${baseUrl.replace(/\/$/, '')}/messages/${conversationId}`
    : null

  try {
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
      to: CONCIERGERIE_RECIPIENT_EMAIL,
      replyTo: request.email,
      subject: `[Love Hotel Rencontre] Conciergerie érotique - ${request.requestTypeLabel}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#24112f">
          <h2>Nouvelle demande de conciergerie érotique</h2>
          <p><strong>Référence :</strong> ${escapeHtml(requestId)}</p>
          <p><strong>Membre :</strong> ${escapeHtml(request.nom)}</p>
          <p><strong>Email :</strong> ${escapeHtml(request.email)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(request.phone || 'Non renseigné')}</p>
          <p><strong>Type :</strong> ${escapeHtml(request.requestTypeLabel)}</p>
          <p><strong>Réponse souhaitée :</strong> ${escapeHtml(request.responsePreferenceLabel)}</p>
          <p><strong>Établissement souhaité :</strong> ${escapeHtml(request.venuePreference || 'Non précisé')}</p>
          <p><strong>Date ou période souhaitée :</strong> ${escapeHtml(request.desiredDate || 'Non précisée')}</p>
          <p><strong>Nombre de personnes ou couples :</strong> ${escapeHtml(request.partySize || 'Non précisé')}</p>
          <p><strong>Ambiance recherchée :</strong> ${escapeHtml(request.mood || 'Non précisée')}</p>
          <p><strong>Budget :</strong> ${escapeHtml(request.budget || 'Non précisé')}</p>
          <p><strong>Demande :</strong></p>
          <div style="white-space:pre-wrap;border-left:4px solid #ff3b8b;padding:12px;background:#f9eef6">
            ${escapeHtml(request.besoin)}
          </div>
          <p><a href="${escapeHtml(adminUrl)}">Voir la demande dans l'administration</a></p>
          ${
            conversationUrl
              ? `<p><a href="${escapeHtml(conversationUrl)}">Répondre dans le chat</a></p>`
              : ''
          }
        </div>
      `,
      text: [
        'Nouvelle demande de conciergerie érotique',
        `Référence : ${requestId}`,
        `Membre : ${request.nom}`,
        `Email : ${request.email}`,
        `Téléphone : ${request.phone || 'Non renseigné'}`,
        `Type : ${request.requestTypeLabel}`,
        `Réponse souhaitée : ${request.responsePreferenceLabel}`,
        `Établissement souhaité : ${request.venuePreference || 'Non précisé'}`,
        `Date ou période souhaitée : ${request.desiredDate || 'Non précisée'}`,
        `Nombre de personnes ou couples : ${request.partySize || 'Non précisé'}`,
        `Ambiance recherchée : ${request.mood || 'Non précisée'}`,
        `Budget : ${request.budget || 'Non précisé'}`,
        '',
        request.besoin,
        '',
        `Admin : ${adminUrl}`,
        conversationUrl ? `Chat : ${conversationUrl}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    })

    return true
  } catch (error) {
    console.warn('Email conciergerie non envoyé:', error)
    return false
  }
}

async function createConciergerieAdminNotifications({
  request,
  requestId,
  requesterId,
  conversationId,
  emailSent
}: {
  request: NormalizedConciergerieRequest
  requestId: string
  requesterId?: string | null
  conversationId?: string | null
  emailSent: boolean
}) {
  const admins = await sql.query<{ id: string }[]>(
    `
      SELECT DISTINCT id
      FROM users
      WHERE (
          role = 'admin'
          OR lower(email) = lower($1)
        )
        AND COALESCE(is_banned, false) = false
        AND COALESCE(status, 'active') = 'active'
      ORDER BY id
    `,
    [CONCIERGERIE_RECIPIENT_EMAIL]
  )
  const link = conversationId ? `/messages/${conversationId}` : '/admin/conciergerie'

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
        'conciergerie_request',
        'Nouvelle demande conciergerie',
        `${request.nom} demande ${request.requestTypeLabel.toLowerCase()} - ${request.responsePreferenceLabel.toLowerCase()}`,
        link,
        null,
        'high',
        'conciergerie',
        'admin',
        JSON.stringify({
          requestId,
          requestType: request.requestType,
          responsePreference: request.responsePreference,
          venuePreference: request.venuePreference || null,
          desiredDate: request.desiredDate || null,
          partySize: request.partySize || null,
          mood: request.mood || null,
          requesterEmail: request.email,
          recipientEmail: CONCIERGERIE_RECIPIENT_EMAIL,
          conversationId: conversationId || null,
          emailSent
        }),
        requesterId || null
      ]
    )
  }

  return admins.length
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const payload = (await request.json()) as ConciergeriePayload
    let conciergeRequest: NormalizedConciergerieRequest

    try {
      conciergeRequest = normalizePayload(payload, session?.user)
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Demande conciergerie invalide.'
        },
        { status: 400 }
      )
    }

    await ensureConciergerieSchema()

    const requesterId = session?.user?.id || null
    const [storedRequest] = await sql.query<{ id: string }[]>(
      `
        INSERT INTO conciergerie_requests (
          user_id,
          nom,
          email,
          phone,
          request_type,
          response_preference,
          besoin,
          budget,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id
      `,
      [
        requesterId,
        conciergeRequest.nom,
        conciergeRequest.email,
        conciergeRequest.phone || null,
        conciergeRequest.requestType,
        conciergeRequest.responsePreference,
        conciergeRequest.besoin,
        conciergeRequest.budget || null
      ]
    )

    const requestId = storedRequest.id
    const conversationId = await createConciergerieConversation({
      request: conciergeRequest,
      requestId,
      requesterId
    })
    const emailSent = await sendConciergerieEmail(
      conciergeRequest,
      requestId,
      conversationId
    )

    await sql.query(
      `
        UPDATE conciergerie_requests
        SET conversation_id = $2,
            email_sent = $3,
            admin_notified_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [requestId, conversationId, emailSent]
    )

    let adminNotificationCount = 0
    try {
      adminNotificationCount = await createConciergerieAdminNotifications({
        request: conciergeRequest,
        requestId,
        requesterId,
        conversationId,
        emailSent
      })
    } catch (error) {
      console.warn('Notification admin conciergerie indisponible:', error)
    }

    return NextResponse.json({
      ok: true,
      emailSent,
      conversationId,
      adminNotificationCount
    })
  } catch (error) {
    console.error('API conciergerie error:', error)
    return NextResponse.json(
      { ok: false, error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
