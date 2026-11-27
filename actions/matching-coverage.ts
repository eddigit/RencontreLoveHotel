'use server'

import { requireAdmin } from '@/lib/server-auth'
import { sql } from '@/lib/db'

export async function getMatchingCoverage() {
  await requireAdmin()
  const [counts] = await sql.query<Array<{ total: number; targets: number; intents: number; both: number }>>(`
    WITH eligible AS (
      SELECT u.id,
             bool_or(cardinality(p.seeking_profile_types) > 0) AS has_targets,
             bool_or(cardinality(p.relationship_intents) > 0) AS has_intents
      FROM users u JOIN user_profiles p ON p.user_id = u.id
      WHERE u.onboarding_completed AND p.display_profile AND NOT COALESCE(u.is_banned, false)
        AND COALESCE(u.status, 'active') <> 'banned'
      GROUP BY u.id
    )
    SELECT count(*)::int AS total,
           (count(*) FILTER (WHERE has_targets))::int AS targets,
           (count(*) FILTER (WHERE has_intents))::int AS intents,
           (count(*) FILTER (WHERE has_intents AND has_targets))::int AS both
    FROM eligible
  `)
  return counts
}
