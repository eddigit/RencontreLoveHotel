'use server'

import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'
import { ensureProfileVisitsSchema } from '@/lib/profile-visits'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ProfileVisitor = {
  id: string
  name: string | null
  avatar: string | null
  age: number | null
  location: string | null
  profile_status: string | null
  gender: string | null
  visited_at: string
}

/**
 * Records a real, visible profile opening. The visitor identity always comes
 * from the authenticated server session, never from client input.
 */
export async function recordProfileVisit(profileUserId: string) {
  const currentUser = await requireCurrentUser()
  if (!uuidPattern.test(profileUserId) || profileUserId === currentUser.id) {
    return { recorded: false }
  }
  await ensureProfileVisitsSchema()

  const rows = await sql.query<Array<{ visited_at: string }>>(
    `
      WITH expired_visits AS (
        DELETE FROM profile_visits
        WHERE visited_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
          AND NOT (visitor_id = $1 AND visited_id = $2)
      ), eligible_visit AS (
        SELECT DISTINCT visitor.id AS visitor_id, visited.id AS visited_id
        FROM users visitor
        JOIN user_profiles visitor_profile ON visitor_profile.user_id = visitor.id
        JOIN users visited ON visited.id = $2
        JOIN user_profiles visited_profile ON visited_profile.user_id = visited.id
        WHERE visitor.id = $1
          AND visitor.id <> visited.id
          AND COALESCE(visitor.is_banned, false) = false
          AND COALESCE(visitor.status, 'active') = 'active'
          AND visitor_profile.display_profile = TRUE
          AND COALESCE(visited.is_banned, false) = false
          AND COALESCE(visited.status, 'active') = 'active'
          AND visited_profile.display_profile = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM user_blocks block
            WHERE (block.blocker_id = visitor.id AND block.blocked_id = visited.id)
               OR (block.blocker_id = visited.id AND block.blocked_id = visitor.id)
          )
      )
      INSERT INTO profile_visits (visitor_id, visited_id, visited_at)
      SELECT visitor_id, visited_id, CURRENT_TIMESTAMP FROM eligible_visit
      ON CONFLICT (visitor_id, visited_id)
      DO UPDATE SET visited_at = EXCLUDED.visited_at
      RETURNING visited_at
    `,
    [currentUser.id, profileUserId]
  )

  return { recorded: Boolean(rows[0]) }
}

/** Returns the authenticated member's eligible profile visitors from 30 days. */
export async function getProfileVisitors(limit = 12): Promise<ProfileVisitor[]> {
  const currentUser = await requireCurrentUser()
  const safeLimit = Math.min(24, Math.max(1, Math.floor(Number(limit) || 12)))
  await ensureProfileVisitsSchema()

  return sql.query<ProfileVisitor[]>(
    `
      SELECT * FROM (
        SELECT DISTINCT ON (visitor.id)
          visitor.id, visitor.name, visitor.avatar, visitor_profile.age,
          visitor_profile.location, visitor_profile.status AS profile_status,
          visitor_profile.gender, profile_visits.visited_at
        FROM profile_visits
        JOIN users visitor ON visitor.id = profile_visits.visitor_id
        JOIN user_profiles visitor_profile ON visitor_profile.user_id = visitor.id
        JOIN users owner ON owner.id = profile_visits.visited_id
        JOIN user_profiles owner_profile ON owner_profile.user_id = owner.id
        WHERE profile_visits.visited_id = $1
          AND profile_visits.visited_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
          AND COALESCE(visitor.is_banned, false) = false
          AND COALESCE(visitor.status, 'active') = 'active'
          AND visitor_profile.display_profile = TRUE
          AND COALESCE(owner.is_banned, false) = false
          AND COALESCE(owner.status, 'active') = 'active'
          AND owner_profile.display_profile = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM user_blocks block
            WHERE (block.blocker_id = $1 AND block.blocked_id = visitor.id)
               OR (block.blocker_id = visitor.id AND block.blocked_id = $1)
          )
        ORDER BY visitor.id, profile_visits.visited_at DESC, visitor_profile.updated_at DESC NULLS LAST
      ) eligible_visitors
      ORDER BY visited_at DESC
      LIMIT $2
    `,
    [currentUser.id, safeLimit]
  )
}
