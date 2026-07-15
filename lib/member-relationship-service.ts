import { sql } from '@/lib/db'

export type ConversationSummary = {
  id: string
  other_user_id: string
  other_user_name: string
  other_user_avatar: string | null
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
  match_score?: number | null
  expires_at?: string | null
  context?: Record<string, unknown> | null
}

export type RelationshipOverview = {
  accepted: RelationshipRow[]
  incoming: RelationshipRow[]
  outgoing: RelationshipRow[]
}

function conversationSummaryQuery(includeAttachments: boolean) {
  const attachmentFallback = includeAttachments
    ? `WHEN EXISTS (
          SELECT 1 FROM message_attachments ma
          WHERE ma.message_id = m.id AND ma.media_type = 'audio'
        ) THEN 'Message vocal'
        WHEN EXISTS (
          SELECT 1 FROM message_attachments ma
          WHERE ma.message_id = m.id AND ma.media_type = 'video'
        ) THEN 'Vidéo partagée'
        WHEN EXISTS (
          SELECT 1 FROM message_attachments ma
          WHERE ma.message_id = m.id AND ma.media_type = 'image'
        ) THEN 'Image partagée'`
    : ''

  return `
    WITH valid_conversations AS (
      SELECT DISTINCT c.id, c.created_at, c.updated_at
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
      WHERE um.id IS NOT NULL
        OR viewer_user.role = 'admin'
        OR other_user.role = 'admin'
    ),
    last_messages AS (
      SELECT
        m.conversation_id,
        CASE
          WHEN NULLIF(TRIM(m.content), '') IS NOT NULL THEN m.content
          ${attachmentFallback}
          ELSE m.content
        END AS content,
        m.created_at,
        ROW_NUMBER() OVER (
          PARTITION BY m.conversation_id ORDER BY m.created_at DESC
        ) AS row_number
      FROM messages m
      JOIN valid_conversations vc ON vc.id = m.conversation_id
    )
    SELECT
      vc.id,
      other_user.id AS other_user_id,
      COALESCE(other_user.name, 'Membre') AS other_user_name,
      other_user.avatar AS other_user_avatar,
      lm.content AS last_message,
      lm.created_at AS last_message_date
    FROM valid_conversations vc
    JOIN conversation_participants other
      ON other.conversation_id = vc.id AND other.user_id != $1
    JOIN users other_user ON other_user.id = other.user_id
    LEFT JOIN last_messages lm
      ON lm.conversation_id = vc.id AND lm.row_number = 1
    ORDER BY lm.created_at DESC NULLS LAST, vc.updated_at DESC
  `
}

function isMissingAttachmentSchema(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return error.code === '42P01' || error.code === '42703'
}

export async function getMemberConversationSummaries(userId: string) {
  try {
    return await sql.query<ConversationSummary[]>(
      conversationSummaryQuery(true),
      [userId]
    )
  } catch (error) {
    if (!isMissingAttachmentSchema(error)) throw error
    return sql.query<ConversationSummary[]>(
      conversationSummaryQuery(false),
      [userId]
    )
  }
}

export async function getMemberRelationshipOverview(
  userId: string
): Promise<RelationshipOverview> {
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
