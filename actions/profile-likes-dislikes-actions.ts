'use server'
import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'
import { ensureProfileLikesDislikesSchema, parseProfileTags } from '@/lib/profile-likes-dislikes'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export type PublicProfilePreferences = { bio: string | null; interests: string[]; likes: string[]; dislikes: string[] }

/** Member-visible profile preferences, filtered by current profile visibility and bilateral blocks. */
export async function getPublicProfilePreferences(profileUserId: string): Promise<PublicProfilePreferences | null> {
  const viewer = await requireCurrentUser(); if (!UUID.test(profileUserId)) return null
  await ensureProfileLikesDislikesSchema()
  const rows = await sql.query<Array<{ bio: string | null; interests: unknown; likes: unknown; dislikes: unknown }>>(`SELECT up.bio, up.interests, up.likes, up.dislikes FROM users u JOIN user_profiles up ON up.user_id = u.id WHERE u.id = $1 AND up.display_profile = TRUE AND COALESCE(u.is_banned, false) = false AND COALESCE(u.status, 'active') = 'active' AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = $2 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $2)) ORDER BY up.updated_at DESC NULLS LAST, up.id DESC LIMIT 1`, [profileUserId, viewer.id])
  const row = rows[0]; return row ? { bio: row.bio, interests: parseProfileTags(row.interests), likes: parseProfileTags(row.likes), dislikes: parseProfileTags(row.dislikes) } : null
}
