import 'server-only'
import { sql } from '@/lib/db'
import { ensurePresenceSchema, onlinePresenceCondition } from '@/lib/presence'
export type MemberPortrait = {
  id: string
  name: string
  image: string | null
  gender: string | null
  profile_status: string | null
  online: boolean
  joined_this_week: boolean
}

export async function listMemberPortraits(viewerId: string, offset: number) {
  const hasPresence = await ensurePresenceSchema()
  const online = hasPresence ? onlinePresenceCondition('u.last_seen_at') : 'FALSE'
  return sql.query<MemberPortrait[]>(`
      SELECT u.id, u.name, COALESCE((
        SELECT p.url FROM photos p WHERE p.user_id = u.id AND p.is_primary IS TRUE
        ORDER BY p.created_at DESC, p.id LIMIT 1
      ), NULLIF(TRIM(u.avatar), '')) AS image, up.gender, up.status AS profile_status, ${online} AS online,
        u.created_at >= NOW() - INTERVAL '7 days' AS joined_this_week
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id <> $1 AND up.display_profile IS TRUE AND u.onboarding_completed IS TRUE
        AND NOT COALESCE(u.is_banned, FALSE) AND COALESCE(u.status, 'active') <> 'banned'
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b WHERE
            (b.blocker_id = $1 AND b.blocked_id = u.id) OR
            (b.blocker_id = u.id AND b.blocked_id = $1)
        )
      ORDER BY online DESC, joined_this_week DESC NULLS LAST,
        (u.avatar ILIKE '%blob.vercel-storage.com/%') DESC NULLS LAST,
        u.created_at DESC NULLS LAST, u.id
      LIMIT 36 OFFSET $2
    `, [viewerId, offset])
}
