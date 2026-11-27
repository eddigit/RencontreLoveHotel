import 'server-only'
import { sql } from '@/lib/db'
import { ensurePresenceSchema, onlinePresenceCondition } from '@/lib/presence'
import { eligibleMemberPhotoSql } from '@/lib/member-photo'
import { ensureAdminUserStarSchema } from '@/lib/admin-user-star'
export type MemberPortrait = {
  id: string
  name: string
  image: string | null
  gender: string | null
  profile_status: string | null
  online: boolean
  joined_this_week: boolean
  photo_rank: number
}

export async function listMemberPortraits(viewerId: string, offset: number, visitSeed = 'initial') {
  await ensureAdminUserStarSchema()
  const hasPresence = await ensurePresenceSchema()
  const online = hasPresence ? onlinePresenceCondition('u.last_seen_at') : 'FALSE'
  return sql.query<MemberPortrait[]>(`
      SELECT u.id, u.name, COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), '')) AS image,
        up.gender, up.status AS profile_status, ${online} AS online,
        u.created_at >= NOW() - INTERVAL '7 days' AS joined_this_week,
        CASE
          WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} AND u.admin_starred_at IS NOT NULL AND u.moderator_spotlight_at IS NOT NULL THEN 3
          WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} AND u.admin_starred_at IS NOT NULL THEN 2
          WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} THEN 1
          ELSE 0
        END AS photo_rank
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT p.url FROM photos p WHERE p.user_id = u.id AND p.is_primary IS TRUE
        ORDER BY p.created_at DESC, p.id LIMIT 1
      ) primary_photo ON TRUE
      WHERE u.id <> $1 AND up.display_profile IS TRUE AND u.onboarding_completed IS TRUE
        AND NOT COALESCE(u.is_banned, FALSE) AND COALESCE(u.status, 'active') <> 'banned'
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b WHERE
            (b.blocker_id = $1 AND b.blocked_id = u.id) OR
            (b.blocker_id = u.id AND b.blocked_id = $1)
        )
      ORDER BY photo_rank DESC,
        md5(CONCAT(u.id::text, ':', $1::text, ':', $3::text)) ASC,
        u.id ASC
      LIMIT 36 OFFSET $2
    `, [viewerId, offset, String(visitSeed).slice(0, 128)])
}
