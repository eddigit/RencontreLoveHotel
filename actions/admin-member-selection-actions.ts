'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { ensureAdminUserStarSchema } from '@/lib/admin-user-star'
import { eligibleMemberPhotoSql } from '@/lib/member-photo'
import { requireAdmin } from '@/lib/server-auth'

const MEMBER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_SELECTED_MEMBERS = 500

export type StarSelectedMembersResult = {
  starredCount: number
  alreadyStarredCount: number
  /** Members left untouched because featuring requires a personal photo. */
  withoutPhotoIds: string[]
}

/**
 * Feature every selected member who has an eligible personal photo. The photo
 * rule is the one enforced for a single member; nobody is featured without it.
 */
export async function starSelectedMembers(memberIds: string[]): Promise<StarSelectedMembersResult> {
  await requireAdmin()

  const ids = Array.from(new Set(Array.isArray(memberIds) ? memberIds : []))
  if (
    ids.length === 0 ||
    ids.length > MAX_SELECTED_MEMBERS ||
    ids.some(id => typeof id !== 'string' || !MEMBER_ID_PATTERN.test(id))
  ) {
    throw new Error(`Sélection invalide : de 1 à ${MAX_SELECTED_MEMBERS} membres`)
  }

  await ensureAdminUserStarSchema()

  const displayedPhoto = "COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))"
  const targets = await sql.query<Array<{ id: string; has_eligible_photo: boolean; already_starred: boolean }>>(`
    SELECT u.id,
           ${eligibleMemberPhotoSql(displayedPhoto, 'primary_photo.url IS NOT NULL')} AS has_eligible_photo,
           u.admin_starred_at IS NOT NULL AS already_starred
    FROM users u
    LEFT JOIN LATERAL (
      SELECT p.url FROM photos p
      WHERE p.user_id = u.id AND p.is_primary IS TRUE
      ORDER BY p.created_at DESC, p.id
      LIMIT 1
    ) primary_photo ON TRUE
    WHERE u.id = ANY($1::uuid[])
  `, [ids])

  const withoutPhotoIds = targets.filter(target => !target.has_eligible_photo).map(target => String(target.id))
  const alreadyStarredCount = targets.filter(target => target.has_eligible_photo && target.already_starred).length
  const toStar = targets
    .filter(target => target.has_eligible_photo && !target.already_starred)
    .map(target => String(target.id))

  if (toStar.length === 0) {
    return { starredCount: 0, alreadyStarredCount, withoutPhotoIds }
  }

  const updated = await sql.query<Array<{ id: string }>>(`
    UPDATE users
    SET admin_starred_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1::uuid[]) AND admin_starred_at IS NULL
    RETURNING id
  `, [toStar])

  revalidatePath('/admin/users')
  return { starredCount: updated.length, alreadyStarredCount, withoutPhotoIds }
}
