import { sql } from '@/lib/db'
import { ensurePresenceSchema, onlinePresenceCondition } from '@/lib/presence'

export type ConversationSummary = {
  id: string
  other_user_id: string
  other_user_name: string
  other_user_avatar: string | null
  other_user_gender?: string | null
  other_user_profile_status?: string | null
  other_user_online?: boolean
  has_unread_messages: boolean
  last_message: string | null
  last_message_date: string | null
}

export type RelationshipRow = {
  relationship_kind: 'accepted' | 'incoming' | 'outgoing'
  match_id?: string
  other_user_id: string
  other_user_name?: string
  other_user_avatar?: string | null
  other_user_age?: number | null
  other_user_location?: string | null
  other_user_profile_status?: string | null
  other_user_gender?: string | null
  other_user_online?: boolean
  match_score?: number | null
  expires_at?: string | null
  context?: Record<string, unknown> | null
}

export type RelationshipOverview = {
  accepted: RelationshipRow[]
  incoming: RelationshipRow[]
  outgoing: RelationshipRow[]
}

function conversationSummaryQuery(
  includeAttachments: boolean,
  presenceColumn: string,
  conversationId?: string
) {
  const attachmentFallback = includeAttachments
    ? `WHEN latest_attachment.has_audio THEN 'Message vocal'
        WHEN latest_attachment.has_video THEN 'Vidéo partagée'
        WHEN latest_attachment.has_image THEN 'Image partagée'`
    : ''
  const attachmentJoin = includeAttachments
    ? `LEFT JOIN LATERAL (
        SELECT
          BOOL_OR(ma.media_type = 'audio') AS has_audio,
          BOOL_OR(ma.media_type = 'video') AS has_video,
          BOOL_OR(ma.media_type = 'image') AS has_image
        FROM message_attachments ma
        WHERE ma.message_id = lm.id
      ) latest_attachment ON TRUE`
    : ''
  const conversationFilter = conversationId ? 'AND c.id = $2' : ''

  return `
    WITH valid_conversations AS (
      SELECT DISTINCT c.id, c.updated_at
      FROM conversations c
      JOIN conversation_participants viewer
        ON viewer.conversation_id = c.id AND viewer.user_id = $1
      JOIN conversation_participants other
        ON other.conversation_id = c.id AND other.user_id != $1
      JOIN users viewer_user ON viewer_user.id = $1
      JOIN users other_user ON other_user.id = other.user_id
      LEFT JOIN user_matches um ON
        ((um.user_id_1 = $1 AND um.user_id_2 = other.user_id) OR
         (um.user_id_1 = other.user_id AND um.user_id_2 = $1))
        AND um.status = 'accepted'
      WHERE (
        um.id IS NOT NULL
        OR viewer_user.role = 'admin'
        OR other_user.role = 'admin'
      )
        AND NOT EXISTS (
          SELECT 1
          FROM user_blocks block
          WHERE (block.blocker_id = $1 AND block.blocked_id = other.user_id)
             OR (block.blocker_id = other.user_id AND block.blocked_id = $1)
        )
        ${conversationFilter}
    )
    SELECT
      vc.id,
      other_user.id AS other_user_id,
      COALESCE(other_user.name, 'Membre') AS other_user_name,
      COALESCE(primary_photo.url, other_user.avatar) AS other_user_avatar,
      other_profile.gender AS other_user_gender,
      other_profile.status AS other_user_profile_status,
      ${onlinePresenceCondition(presenceColumn)} AS other_user_online,
      EXISTS (
        SELECT 1
        FROM messages unread_message
        WHERE unread_message.conversation_id = vc.id
          AND unread_message.sender_id != $1
          AND COALESCE(unread_message.is_read, false) = false
        LIMIT 1
      ) AS has_unread_messages,
      CASE
        WHEN NULLIF(TRIM(lm.content), '') IS NOT NULL THEN lm.content
        ${attachmentFallback}
        ELSE lm.content
      END AS last_message,
      lm.created_at AS last_message_date
    FROM valid_conversations vc
    JOIN conversation_participants other
      ON other.conversation_id = vc.id AND other.user_id != $1
    JOIN users other_user ON other_user.id = other.user_id
    LEFT JOIN user_profiles other_profile ON other_profile.user_id = other_user.id
    LEFT JOIN LATERAL (
      SELECT photos.url
      FROM photos
      WHERE photos.user_id = other_user.id
        AND photos.is_primary IS TRUE
      ORDER BY photos.created_at ASC
      LIMIT 1
    ) primary_photo ON TRUE
    LEFT JOIN LATERAL (
      SELECT m.id, m.content, m.created_at
      FROM messages m
      WHERE m.conversation_id = vc.id
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    ) lm ON TRUE
    ${attachmentJoin}
    ORDER BY lm.created_at DESC NULLS LAST, vc.updated_at DESC
  `
}

function isMissingAttachmentSchema(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return error.code === '42P01' || error.code === '42703'
}

export async function getMemberConversationSummaries(userId: string, recentOnly = false) {
  const hasPresenceColumn = await ensurePresenceSchema()
  const presenceColumn = hasPresenceColumn ? 'other_user.last_seen_at' : 'other_user.updated_at'

  const limit = recentOnly ? ' LIMIT 3' : ''
  try {
    return await sql.query<ConversationSummary[]>(
      conversationSummaryQuery(true, presenceColumn) + limit,
      [userId]
    )
  } catch (error) {
    if (!isMissingAttachmentSchema(error)) throw error
    return sql.query<ConversationSummary[]>(
      conversationSummaryQuery(false, presenceColumn) + limit,
      [userId]
    )
  }
}

export async function getMemberConversationSummary(userId: string, conversationId: string) {
  const hasPresenceColumn = await ensurePresenceSchema()
  const presenceColumn = hasPresenceColumn ? 'other_user.last_seen_at' : 'other_user.updated_at'

  try {
    const rows = await sql.query<ConversationSummary[]>(
      conversationSummaryQuery(true, presenceColumn, conversationId),
      [userId, conversationId]
    )
    return rows[0] || null
  } catch (error) {
    if (!isMissingAttachmentSchema(error)) throw error
    const rows = await sql.query<ConversationSummary[]>(
      conversationSummaryQuery(false, presenceColumn, conversationId),
      [userId, conversationId]
    )
    return rows[0] || null
  }
}

export async function getMemberRelationshipOverview(
  userId: string
): Promise<RelationshipOverview> {
  const hasPresenceColumn = await ensurePresenceSchema()
  const presenceColumn = hasPresenceColumn
    ? 'other_user.last_seen_at'
    : 'other_user.updated_at'
  const rows = await sql.query<RelationshipRow[]>(
    `
      SELECT
        CASE
          WHEN um.status = 'accepted' THEN 'accepted'
          WHEN um.user_id_2 = $1 THEN 'incoming'
          ELSE 'outgoing'
        END AS relationship_kind,
        um.id AS match_id,
        other_user.id AS other_user_id,
        COALESCE(other_user.name, 'Membre') AS other_user_name,
        COALESCE(other_user.avatar, primary_photo.url) AS other_user_avatar,
        other_profile.age AS other_user_age,
        other_profile.location AS other_user_location,
        other_profile.status AS other_user_profile_status,
        other_profile.gender AS other_user_gender,
        ${onlinePresenceCondition(presenceColumn)} AS other_user_online,
        um.match_score,
        um.expires_at,
        um.context
      FROM user_matches um
      JOIN users other_user ON other_user.id = CASE
        WHEN um.user_id_1 = $1 THEN um.user_id_2
        ELSE um.user_id_1
      END
      LEFT JOIN user_profiles other_profile ON other_profile.user_id = other_user.id
      LEFT JOIN LATERAL (
        SELECT photos.url
        FROM photos
        WHERE photos.user_id = other_user.id
        ORDER BY photos.is_primary DESC, photos.created_at ASC
        LIMIT 1
      ) primary_photo ON true
      WHERE (um.user_id_1 = $1 OR um.user_id_2 = $1)
        AND um.status IN ('accepted', 'pending')
        AND (um.status <> 'pending' OR um.expires_at IS NULL OR um.expires_at > NOW())
      ORDER BY um.updated_at DESC, um.created_at DESC
    `,
    [userId]
  )

  const overview: RelationshipOverview = {
    accepted: [],
    incoming: [],
    outgoing: []
  }

  for (const row of rows || []) {
    if (row.relationship_kind === 'accepted') overview.accepted.push(row)
    else if (row.relationship_kind === 'incoming') overview.incoming.push(row)
    else if (row.relationship_kind === 'outgoing') overview.outgoing.push(row)
  }

  return overview
}
