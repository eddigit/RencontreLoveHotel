'use server'

import { sql } from '@/lib/db'
import { validateImageFile } from '@/lib/image-upload-validation'
import { requireCurrentUser } from '@/lib/server-auth'
import { put } from '@vercel/blob'
import { createNotificationRecord as createNotification } from '@/lib/notification-service'
import { findOrCreateConversation } from '@/actions/conversation-actions'
import { notifyAdminByEmail } from '@/lib/admin-email-notifications'

type WallPostType = 'profil' | 'evenement' | 'dispo_rideaux_ouverts'
type WallStatus = 'active' | 'hidden' | 'removed'
type ModerationSeverity = 'low' | 'medium' | 'high' | 'critical'
type ModerationAction = 'flag' | 'hide' | 'escalate'
type WallSourceType = 'wall_post' | 'wall_comment'

type ModerationRule = {
  keyword: string
  severity: ModerationSeverity
  action: ModerationAction
}

type CommunityWallFeedOptions = {
  limit?: number
}

type CreateWallPostInput = {
  type: string
  body?: string
  eventId?: string | null
  durationHours?: number
  image?: File | null
  venue?: 'chatelet' | 'pigalle' | string
  roomName?: string
  startsAt?: string
  guestCapacity?: number
  bookingConfirmed?: boolean
  bookingReference?: string
}

export type WallParticipationRequest = {
  id: string
  post_id: string
  user_id: string
  message?: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  conversation_id?: string | null
  created_at: string | Date
  member_name?: string | null
  member_avatar?: string | null
  member_location?: string | null
}

export type CommunityWallPost = {
  id: string
  user_id: string
  type: WallPostType
  body: string
  image_url?: string | null
  image_mime_type?: string | null
  image_size_bytes?: number | string | null
  event_id?: string | null
  expires_at?: string | Date | null
  status: WallStatus
  created_at: string | Date
  updated_at?: string | Date
  author_name?: string | null
  author_avatar?: string | null
  author_location?: string | null
  event_title?: string | null
  event_date?: string | Date | null
  event_time?: string | null
  comment_count?: number | string
  has_reported?: boolean
  venue?: 'chatelet' | 'pigalle' | null
  room_name?: string | null
  starts_at?: string | Date | null
  guest_capacity?: number | null
  booking_confirmed?: boolean
  participation_request_count?: number | string
  accepted_participant_count?: number | string
  current_user_request_status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | null
  current_user_conversation_id?: string | null
}

export type CommunityWallComment = {
  id: string
  post_id: string
  user_id: string
  body: string
  status: WallStatus
  created_at: string | Date
  author_name?: string | null
  author_avatar?: string | null
  has_reported?: boolean
}

const validPostTypes: WallPostType[] = [
  'profil',
  'evenement',
  'dispo_rideaux_ouverts'
]

const severityRank: Record<ModerationSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
}

function normalizeBody(
  body: string | undefined,
  maxLength: number,
  label: string,
  options: { allowEmpty?: boolean } = {}
) {
  const normalized = (body || '').trim()

  if (!normalized && !options.allowEmpty) {
    throw new Error(`${label} requis`)
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} limite a ${maxLength} caracteres`)
  }

  return normalized
}

function getNonEmptyFile(value: unknown) {
  if (typeof File === 'undefined') return null
  return value instanceof File && value.size > 0 ? value : null
}

function getFormDataString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : undefined
}

function normalizeCreateWallPostInput(input: CreateWallPostInput | FormData): CreateWallPostInput {
  if (input instanceof FormData) {
    const duration = getFormDataString(input, 'durationHours')
    return {
      type: getFormDataString(input, 'type') || '',
      body: getFormDataString(input, 'body') || '',
      eventId: getFormDataString(input, 'eventId') || null,
      durationHours: duration ? Number(duration) : undefined,
      image: getNonEmptyFile(input.get('image')),
      venue: getFormDataString(input, 'venue'),
      roomName: getFormDataString(input, 'roomName'),
      startsAt: getFormDataString(input, 'startsAt'),
      guestCapacity: Number(getFormDataString(input, 'guestCapacity') || 0),
      bookingConfirmed: getFormDataString(input, 'bookingConfirmed') === 'true',
      bookingReference: getFormDataString(input, 'bookingReference')
    }
  }

  return {
    ...input,
    image: getNonEmptyFile(input.image)
  }
}

function normalizeBookedRoomInvitation(input: CreateWallPostInput) {
  const venue = input.venue === 'chatelet' || input.venue === 'pigalle'
    ? input.venue
    : null
  const roomName = (input.roomName || '').trim()
  const bookingReference = (input.bookingReference || '').trim()
  const startsAt = input.startsAt ? new Date(input.startsAt) : null
  const guestCapacity = Math.floor(Number(input.guestCapacity || 0))

  if (!venue) throw new Error('Indiquez l’établissement souhaité')
  if (!startsAt || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    throw new Error('Choisissez une date et une heure à venir')
  }
  if (guestCapacity < 1 || guestCapacity > 8) {
    throw new Error('Le nombre de places doit être compris entre 1 et 8')
  }
  if (input.bookingConfirmed && !bookingReference) {
    throw new Error('Indiquez la référence de réservation')
  }
  if (input.bookingConfirmed && !roomName) {
    throw new Error('Indiquez la chambre réservée')
  }

  return {
    venue,
    roomName: roomName || null,
    bookingReference: input.bookingConfirmed ? bookingReference : null,
    bookingConfirmed: Boolean(input.bookingConfirmed),
    startsAt,
    guestCapacity
  }
}

function normalizePostType(type: string | undefined): WallPostType {
  if (!type || !validPostTypes.includes(type as WallPostType)) {
    throw new Error("Type d'annonce invalide")
  }

  return type as WallPostType
}

function normalizeDurationHours(durationHours: number | undefined) {
  if (durationHours !== 24 && durationHours !== 48) {
    throw new Error('Choisissez une disponibilite de 24 h ou 48 h')
  }

  return durationHours
}

function pickSeverity(rules: ModerationRule[]): ModerationSeverity {
  return rules.reduce<ModerationSeverity>((current, rule) => {
    return severityRank[rule.severity] > severityRank[current]
      ? rule.severity
      : current
  }, 'low')
}

function excerptText(body: string) {
  return body.length > 280 ? `${body.slice(0, 277)}...` : body
}

async function getMatchedModerationRules(body: string) {
  const rules = await sql.query<ModerationRule[]>(
    `
      SELECT keyword, severity, action
      FROM moderation_keywords
      WHERE active = true
    `,
    []
  )

  const normalizedBody = body.toLowerCase()
  return rules.filter(rule => normalizedBody.includes(rule.keyword.toLowerCase()))
}

async function queueWallModeration(input: {
  sourceType: WallSourceType
  sourceId: string
  userId: string | null
  severity: ModerationSeverity
  reason: string
  matchedKeywords?: string[]
  excerpt?: string | null
  metadata?: Record<string, unknown>
}) {
  await sql.query(
    `
      INSERT INTO moderation_queue (
        source_type, source_id, user_id, severity, status,
        reason, matched_keywords, excerpt, metadata
      )
      VALUES ($1, $2, $3, $4, 'new', $5, $6::text[], $7, $8::jsonb)
    `,
    [
      input.sourceType,
      input.sourceId,
      input.userId,
      input.severity,
      input.reason,
      input.matchedKeywords || [],
      input.excerpt || null,
      JSON.stringify(input.metadata || {})
    ]
  )
  await notifyAdminByEmail({
    kind: 'moderation_queued',
    subject: `Nouveau contenu à modérer : ${input.sourceType}`,
    title: 'Un contenu vient d’entrer en modération',
    details: [
      { label: 'Source', value: input.sourceType },
      { label: 'Identifiant', value: input.sourceId },
      { label: 'Membre', value: input.userId },
      { label: 'Gravité', value: input.severity },
      { label: 'Motif', value: input.reason },
      { label: 'Mots détectés', value: input.matchedKeywords?.join(', ') }
    ],
    message: input.excerpt,
    actionPath: '/admin/moderation'
  })
}

async function validateLinkedEvent(eventId: string) {
  const [event] = await sql.query<Array<{ id: string }>>(
    `
      SELECT id, title, event_date, event_time
      FROM events
      WHERE id = $1
        AND publication_status = 'published'
        AND (event_date::timestamp + event_time) > NOW()
      LIMIT 1
    `,
    [eventId]
  )

  if (!event) {
    throw new Error('Selectionnez un evenement publie a venir')
  }
}

export async function getCommunityWallFeed(
  options: CommunityWallFeedOptions = {}
): Promise<CommunityWallPost[]> {
  const user = await requireCurrentUser()
  const limit = Math.min(Math.max(Number(options.limit || 30), 1), 50)

  return await sql.query<CommunityWallPost[]>(
    `
      SELECT
        wp.id,
        wp.user_id,
        wp.type,
        wp.body,
        wp.image_url,
        wp.image_mime_type,
        wp.image_size_bytes,
        wp.event_id,
        wp.expires_at,
        wp.venue,
        wp.room_name,
        wp.starts_at,
        wp.guest_capacity,
        wp.booking_confirmed,
        wp.status,
        wp.created_at,
        wp.updated_at,
        u.name AS author_name,
        u.avatar AS author_avatar,
        up.location AS author_location,
        e.title AS event_title,
        e.event_date,
        e.event_time,
        COUNT(wc.id) FILTER (WHERE wc.status = 'active') AS comment_count,
        (SELECT COUNT(*) FROM wall_participation_requests wpr WHERE wpr.post_id = wp.id) AS participation_request_count,
        (SELECT COUNT(*) FROM wall_participation_requests wpr WHERE wpr.post_id = wp.id AND wpr.status = 'accepted') AS accepted_participant_count,
        (SELECT wpr.status FROM wall_participation_requests wpr WHERE wpr.post_id = wp.id AND wpr.user_id = $1 LIMIT 1) AS current_user_request_status,
        (SELECT wpr.conversation_id FROM wall_participation_requests wpr WHERE wpr.post_id = wp.id AND wpr.user_id = $1 LIMIT 1) AS current_user_conversation_id,
        EXISTS (
          SELECT 1
          FROM wall_reports wr
          WHERE wr.target_type = 'post'
            AND wr.target_id = wp.id
            AND wr.reporter_id = $1
        ) AS has_reported
      FROM wall_posts wp
      JOIN users u ON u.id = wp.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN events e ON e.id = wp.event_id
      LEFT JOIN wall_comments wc ON wc.post_id = wp.id
      WHERE wp.status = 'active'
        AND (wp.type <> 'dispo_rideaux_ouverts' OR wp.expires_at > NOW())
        AND (
          wp.type <> 'evenement'
          OR wp.event_id IS NULL
          OR (e.event_date::timestamp + e.event_time) > NOW()
        )
      GROUP BY wp.id, u.name, u.avatar, up.location, e.title, e.event_date, e.event_time
      ORDER BY wp.created_at DESC
      LIMIT ${limit}
    `,
    [user.id]
  )
}

export async function getWallComments(input: {
  postId: string
}): Promise<CommunityWallComment[]> {
  const user = await requireCurrentUser()

  return await sql.query<CommunityWallComment[]>(
    `
      SELECT
        wc.id,
        wc.post_id,
        wc.user_id,
        wc.body,
        wc.status,
        wc.created_at,
        u.name AS author_name,
        u.avatar AS author_avatar,
        EXISTS (
          SELECT 1
          FROM wall_reports wr
          WHERE wr.target_type = 'comment'
            AND wr.target_id = wc.id
            AND wr.reporter_id = $2
        ) AS has_reported
      FROM wall_comments wc
      JOIN users u ON u.id = wc.user_id
      JOIN wall_posts wp ON wp.id = wc.post_id
      WHERE wc.post_id = $1
        AND wc.status = 'active'
        AND wp.status = 'active'
      ORDER BY wc.created_at ASC
    `,
    [input.postId, user.id]
  )
}

export async function getWallEventOptions() {
  await requireCurrentUser()

  return await sql.query<Array<{ id: string; title: string; event_date?: string | Date; event_time?: string }>>(
    `
      SELECT id, title, event_date, event_time
      FROM events
      WHERE publication_status = 'published'
        AND (event_date::timestamp + event_time) > NOW()
      ORDER BY event_date ASC, event_time ASC
      LIMIT 20
    `,
    []
  )
}

export async function createWallPost(input: CreateWallPostInput | FormData) {
  const user = await requireCurrentUser()
  const normalizedInput = normalizeCreateWallPostInput(input)
  const type = normalizePostType(normalizedInput.type)
  const bookedRoom = type === 'dispo_rideaux_ouverts'
    ? normalizeBookedRoomInvitation(normalizedInput)
    : null
  const imageFile = normalizedInput.image || null
  const imageValidation = imageFile ? await validateImageFile(imageFile) : null

  if (imageValidation && !imageValidation.ok) {
    throw new Error(imageValidation.error)
  }

  const image = imageValidation?.ok ? imageValidation.image : null
  const body = normalizeBody(normalizedInput.body, 500, 'Annonce', {
    allowEmpty: Boolean(image)
  })

  const [{ count }] = await sql.query<Array<{ count: string | number }>>(
    `
      SELECT COUNT(*) AS count
      FROM wall_posts
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND status <> 'removed'
    `,
    [user.id]
  )

  if (Number(count || 0) >= 3) {
    throw new Error('Limite atteinte : 3 annonces par 24 h')
  }

  let eventId: string | null = null
  let expiresAt: Date | null = null

  if (type === 'evenement' && normalizedInput.eventId) {
    eventId = normalizedInput.eventId
    await validateLinkedEvent(eventId)
  }

  if (type === 'dispo_rideaux_ouverts') {
    expiresAt = new Date(bookedRoom!.startsAt.getTime() + 6 * 60 * 60 * 1000)
  }

  const matchedRules = body ? await getMatchedModerationRules(body) : []
  const status: WallStatus = matchedRules.length > 0 ? 'hidden' : 'active'
  let imageUrl: string | null = null

  if (imageFile && image) {
    const blob = await put(
      `community-wall/${user.id}-${Date.now()}.${image.extension}`,
      imageFile,
      {
        access: 'public',
        contentType: image.mimeType
      }
    )
    imageUrl = blob.url
  }

  const [post] = await sql.query<Array<{ id: string; status: WallStatus }>>(
    `
      INSERT INTO wall_posts (
        user_id, type, body, event_id, expires_at, status,
        image_url, image_mime_type, image_size_bytes,
        venue, room_name, starts_at, guest_capacity,
        booking_confirmed, booking_reference
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, status
    `,
    [
      user.id,
      type,
      body,
      eventId,
      expiresAt,
      status,
      imageUrl,
      image?.mimeType || null,
      image?.sizeBytes || null,
      bookedRoom?.venue || null,
      bookedRoom?.roomName || null,
      bookedRoom?.startsAt || null,
      bookedRoom?.guestCapacity || null,
      bookedRoom?.bookingConfirmed || false,
      bookedRoom?.bookingReference || null
    ]
  )

  if (matchedRules.length > 0) {
    await queueWallModeration({
      sourceType: 'wall_post',
      sourceId: post.id,
      userId: user.id,
      severity: pickSeverity(matchedRules),
      reason: 'Mot-cle detecte dans une annonce du mur',
      matchedKeywords: matchedRules.map(rule => rule.keyword),
      excerpt: excerptText(body),
      metadata: { type, imageUrl }
    })
  }

  return { success: true, postId: post.id, status: post.status }
}

export async function requestWallParticipation(input: {
  postId: string
  message?: string
}) {
  const user = await requireCurrentUser()
  const message = normalizeBody(input.message, 300, 'Message', { allowEmpty: true })
  const [post] = await sql.query<Array<{
    id: string
    user_id: string
    guest_capacity: number
    accepted_count: string | number
  }>>(
    `
      SELECT
        wp.id,
        wp.user_id,
        wp.guest_capacity,
        (SELECT COUNT(*) FROM wall_participation_requests wpr WHERE wpr.post_id = wp.id AND wpr.status = 'accepted') AS accepted_count
      FROM wall_posts wp
      WHERE wp.id = $1
        AND wp.type = 'dispo_rideaux_ouverts'
        AND wp.status = 'active'
        AND wp.starts_at > NOW()
      LIMIT 1
    `,
    [input.postId]
  )

  if (!post) throw new Error('Invitation introuvable ou terminée')
  if (post.user_id === user.id) throw new Error('Vous ne pouvez pas candidater à votre propre invitation')
  if (Number(post.accepted_count || 0) >= Number(post.guest_capacity || 0)) {
    throw new Error('Cette invitation est complète')
  }

  const [request] = await sql.query<Array<{ id: string; status: 'pending' }>>(
    `
      INSERT INTO wall_participation_requests (post_id, user_id, message, status)
      VALUES ($1, $2, $3, 'pending')
      ON CONFLICT (post_id, user_id) DO UPDATE
      SET message = EXCLUDED.message,
          status = CASE
            WHEN wall_participation_requests.status IN ('rejected', 'withdrawn') THEN 'pending'
            ELSE wall_participation_requests.status
          END,
          updated_at = CURRENT_TIMESTAMP
      RETURNING id, status
    `,
    [input.postId, user.id, message || null]
  )

  if (request.status === 'pending') {
    await createNotification({
      userId: post.user_id,
      type: 'wall_participation_request',
      title: 'Nouvelle demande de participation',
      description: 'Un membre souhaite rejoindre votre invitation.',
      link: '/discover#community-wall'
    })
  }

  return { success: true, requestId: request.id, status: request.status }
}

export async function getWallParticipationRequests(input: {
  postId: string
}): Promise<WallParticipationRequest[]> {
  const user = await requireCurrentUser()
  const [post] = await sql.query<Array<{ user_id: string }>>(
    `SELECT user_id FROM wall_posts WHERE id = $1 LIMIT 1`,
    [input.postId]
  )

  if (!post) throw new Error('Invitation introuvable')
  if (post.user_id !== user.id && user.role !== 'admin') {
    throw new Error("Seul l'organisateur peut consulter les demandes")
  }

  return await sql.query<WallParticipationRequest[]>(
    `
      SELECT
        wpr.*,
        u.name AS member_name,
        u.avatar AS member_avatar,
        up.location AS member_location
      FROM wall_participation_requests wpr
      JOIN users u ON u.id = wpr.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE wpr.post_id = $1
      ORDER BY
        CASE wpr.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END,
        wpr.created_at ASC
    `,
    [input.postId]
  )
}

export async function decideWallParticipationRequest(input: {
  requestId: string
  decision: 'accepted' | 'rejected'
}) {
  const user = await requireCurrentUser()
  if (input.decision !== 'accepted' && input.decision !== 'rejected') {
    throw new Error('Décision invalide')
  }

  const [request] = await sql.query<Array<{
    id: string
    user_id: string
    status: string
    post_id: string
    organizer_id: string
    guest_capacity: number
  }>>(
    `
      SELECT
        wpr.id,
        wpr.user_id,
        wpr.status,
        wpr.post_id,
        wp.user_id AS organizer_id,
        wp.guest_capacity
      FROM wall_participation_requests wpr
      JOIN wall_posts wp ON wp.id = wpr.post_id
      WHERE wpr.id = $1
      LIMIT 1
    `,
    [input.requestId]
  )

  if (!request) throw new Error('Demande introuvable')
  if (request.organizer_id !== user.id && user.role !== 'admin') {
    throw new Error("Seul l'organisateur peut répondre à cette demande")
  }
  if (request.status !== 'pending') throw new Error('Cette demande a déjà été traitée')

  if (input.decision === 'accepted') {
    const [{ count }] = await sql.query<Array<{ count: string | number }>>(
      `SELECT COUNT(*) AS count FROM wall_participation_requests WHERE post_id = $1 AND status = 'accepted'`,
      [request.post_id]
    )
    if (Number(count || 0) >= Number(request.guest_capacity || 0)) {
      throw new Error('Toutes les places sont déjà attribuées')
    }
  }

  await sql.query(
    `
      UPDATE wall_participation_requests
      SET status = $2,
          decided_by = $3,
          decided_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [input.requestId, input.decision, user.id]
  )

  let conversationId: string | null = null
  if (input.decision === 'accepted') {
    const existingMatches = await sql.query<Array<{ id: string }>>(
      `
        SELECT id FROM user_matches
        WHERE (user_id_1 = $1 AND user_id_2 = $2)
           OR (user_id_1 = $2 AND user_id_2 = $1)
        LIMIT 1
      `,
      [request.organizer_id, request.user_id]
    )
    if (existingMatches.length > 0) {
      await sql.query(
        `UPDATE user_matches SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [existingMatches[0].id]
      )
    } else {
      await sql.query(
        `INSERT INTO user_matches (user_id_1, user_id_2, status) VALUES ($1, $2, 'accepted')`,
        [request.organizer_id, request.user_id]
      )
    }
    conversationId = await findOrCreateConversation(request.organizer_id, request.user_id)
    await sql.query(
      `UPDATE wall_participation_requests SET conversation_id = $2 WHERE id = $1`,
      [request.id, conversationId]
    )
  }

  await createNotification({
    userId: request.user_id,
    type: input.decision === 'accepted'
      ? 'wall_participation_accepted'
      : 'wall_participation_rejected',
    title: input.decision === 'accepted'
      ? 'Participation acceptée'
      : 'Participation non retenue',
    description: input.decision === 'accepted'
      ? "L'organisateur a accepté votre demande. Vous pouvez maintenant échanger."
      : "L'organisateur n'a pas retenu votre demande pour cette invitation.",
    link: conversationId ? `/messages/${conversationId}` : '/discover#community-wall'
  })

  return { success: true, status: input.decision, conversationId }
}

export async function addWallComment(input: {
  postId: string
  body: string
}) {
  const user = await requireCurrentUser()
  const body = normalizeBody(input.body, 300, 'Commentaire')

  const [{ count }] = await sql.query<Array<{ count: string | number }>>(
    `
      SELECT COUNT(*) AS count
      FROM wall_comments
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '1 hour'
        AND status <> 'removed'
    `,
    [user.id]
  )

  if (Number(count || 0) >= 20) {
    throw new Error('Limite atteinte : 20 commentaires par heure')
  }

  const [post] = await sql.query<Array<{ id: string; status: WallStatus }>>(
    `
      SELECT id, status
      FROM wall_posts
      WHERE id = $1
        AND status = 'active'
        AND (type <> 'dispo_rideaux_ouverts' OR expires_at > NOW())
      LIMIT 1
    `,
    [input.postId]
  )

  if (!post) {
    throw new Error("Annonce introuvable ou expiree")
  }

  const matchedRules = await getMatchedModerationRules(body)
  const status: WallStatus = matchedRules.length > 0 ? 'hidden' : 'active'

  const [comment] = await sql.query<Array<{ id: string; status: WallStatus }>>(
    `
      INSERT INTO wall_comments (post_id, user_id, body, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, status
    `,
    [input.postId, user.id, body, status]
  )

  if (matchedRules.length > 0) {
    await queueWallModeration({
      sourceType: 'wall_comment',
      sourceId: comment.id,
      userId: user.id,
      severity: pickSeverity(matchedRules),
      reason: 'Mot-cle detecte dans un commentaire du mur',
      matchedKeywords: matchedRules.map(rule => rule.keyword),
      excerpt: excerptText(body),
      metadata: { postId: input.postId }
    })
  }

  return { success: true, commentId: comment.id, status: comment.status }
}

async function reportWallTarget(input: {
  targetType: 'post' | 'comment'
  targetId: string
  reason?: string
}) {
  const user = await requireCurrentUser()

  await sql.query(
    `
      INSERT INTO wall_reports (target_type, target_id, reporter_id, reason)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (target_type, target_id, reporter_id) DO NOTHING
    `,
    [input.targetType, input.targetId, user.id, input.reason?.trim() || null]
  )

  const [{ count }] = await sql.query<Array<{ count: string | number }>>(
    `
      SELECT COUNT(*) AS count
      FROM wall_reports
      WHERE target_type = $1
        AND target_id = $2
    `,
    [input.targetType, input.targetId]
  )

  const reportCount = Number(count || 0)
  const sourceType: WallSourceType = input.targetType === 'post'
    ? 'wall_post'
    : 'wall_comment'
  const tableName = input.targetType === 'post' ? 'wall_posts' : 'wall_comments'
  const [target] = await sql.query<Array<{ user_id: string }>>(
    `SELECT user_id FROM ${tableName} WHERE id = $1 LIMIT 1`,
    [input.targetId]
  )

  if (!target) {
    throw new Error('Contenu introuvable')
  }

  const hidden = reportCount >= 3
  if (hidden) {
    await sql.query(
      `UPDATE ${tableName} SET status = 'hidden' WHERE id = $1`,
      [input.targetId]
    )
  }

  await queueWallModeration({
    sourceType,
    sourceId: input.targetId,
    userId: target.user_id,
    severity: hidden ? 'medium' : 'low',
    reason: input.reason?.trim() || 'Signalement membre',
    matchedKeywords: [],
    excerpt: null,
    metadata: {
      reportCount,
      reporterId: user.id,
      autoHidden: hidden
    }
  })

  await notifyAdminByEmail({
    kind: 'wall_reported',
    subject: `Signalement sur le mur : ${sourceType}`,
    title: 'Un membre vient de signaler un contenu',
    details: [
      { label: 'Contenu', value: input.targetId },
      { label: 'Type', value: sourceType },
      { label: 'Auteur', value: target.user_id },
      { label: 'Signalé par', value: user.email || user.id },
      { label: 'Nombre de signalements', value: reportCount },
      { label: 'Masqué automatiquement', value: hidden ? 'Oui' : 'Non' }
    ],
    message: input.reason,
    actionPath: '/admin/moderation'
  })

  return { success: true, hidden, reportCount }
}

export async function reportWallPost(input: {
  postId: string
  reason?: string
}) {
  return reportWallTarget({
    targetType: 'post',
    targetId: input.postId,
    reason: input.reason
  })
}

export async function reportWallComment(input: {
  commentId: string
  reason?: string
}) {
  return reportWallTarget({
    targetType: 'comment',
    targetId: input.commentId,
    reason: input.reason
  })
}

export async function removeOwnWallPost(input: {
  postId: string
}) {
  const user = await requireCurrentUser()
  const [post] = await sql.query<Array<{ user_id: string }>>(
    `SELECT user_id FROM wall_posts WHERE id = $1 LIMIT 1`,
    [input.postId]
  )

  if (!post) {
    throw new Error('Annonce introuvable')
  }

  if (post.user_id !== user.id && user.role !== 'admin') {
    throw new Error("Seul l'auteur peut supprimer cette annonce")
  }

  await sql.query(
    `
      UPDATE wall_posts
      SET status = 'removed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [input.postId]
  )

  return { success: true }
}
