'use server'

import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'

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

export type CommunityWallPost = {
  id: string
  user_id: string
  type: WallPostType
  body: string
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

function normalizeBody(body: string | undefined, maxLength: number, label: string) {
  const normalized = (body || '').trim()

  if (!normalized) {
    throw new Error(`${label} requis`)
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} limite a ${maxLength} caracteres`)
  }

  return normalized
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
        wp.event_id,
        wp.expires_at,
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

export async function createWallPost(input: {
  type: string
  body: string
  eventId?: string | null
  durationHours?: number
}) {
  const user = await requireCurrentUser()
  const type = normalizePostType(input.type)
  const body = normalizeBody(input.body, 500, 'Annonce')

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

  if (type === 'evenement' && input.eventId) {
    eventId = input.eventId
    await validateLinkedEvent(eventId)
  }

  if (type === 'dispo_rideaux_ouverts') {
    const durationHours = normalizeDurationHours(input.durationHours)
    expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000)
  }

  const matchedRules = await getMatchedModerationRules(body)
  const status: WallStatus = matchedRules.length > 0 ? 'hidden' : 'active'

  const [post] = await sql.query<Array<{ id: string; status: WallStatus }>>(
    `
      INSERT INTO wall_posts (user_id, type, body, event_id, expires_at, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, status
    `,
    [user.id, type, body, eventId, expiresAt, status]
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
      metadata: { type }
    })
  }

  return { success: true, postId: post.id, status: post.status }
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
