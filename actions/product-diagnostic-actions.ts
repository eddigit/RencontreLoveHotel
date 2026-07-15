'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'
import {
  buildProductDiagnostic,
  type ProductDiagnostic,
  type ProductDiagnosticMetrics
} from '@/lib/product-diagnostics'

function numberValue(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

async function safeRow(query: string) {
  try {
    return (await sql.query<any[]>(query))[0] || {}
  } catch {
    return {}
  }
}

export async function getProductDiagnostic(): Promise<ProductDiagnostic> {
  await requireAdmin()

  const [core, messaging, exposure, reports, schema] = await Promise.all([
    safeRow(`
      SELECT
        (SELECT COUNT(*) FROM users) AS accounts,
        (SELECT COUNT(*) FROM user_profiles) AS profile_rows,
        (SELECT COUNT(*) FROM users u JOIN user_profiles up ON up.user_id = u.id
          WHERE up.display_profile = TRUE AND u.onboarding_completed = TRUE
            AND COALESCE(u.is_banned, FALSE) = FALSE AND COALESCE(u.status, 'active') <> 'banned') AS eligible_profiles,
        (SELECT COUNT(*) FROM user_profiles up JOIN users u ON u.id = up.user_id
          WHERE NULLIF(TRIM(u.avatar), '') IS NOT NULL OR EXISTS (SELECT 1 FROM photos p WHERE p.user_id = up.user_id)) AS profiles_with_media,
        (SELECT COUNT(*) FROM user_profiles WHERE NULLIF(TRIM(bio), '') IS NOT NULL) AS profiles_with_bio,
        (SELECT COUNT(*) FROM user_profiles WHERE age IS NOT NULL AND NULLIF(TRIM(location), '') IS NOT NULL AND NULLIF(TRIM(bio), '') IS NOT NULL) AS complete_profiles,
        (SELECT COUNT(*) FROM user_matches) AS match_requests,
        (SELECT COUNT(*) FROM user_matches WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())) AS pending_matches,
        (SELECT COUNT(*) FROM user_matches WHERE status = 'accepted') AS accepted_matches,
        (SELECT COUNT(*) FROM user_matches WHERE status = 'rejected' OR (status = 'pending' AND expires_at <= NOW())) AS rejected_matches,
        (SELECT COUNT(*) FROM events WHERE event_date >= NOW()) AS future_events,
        (SELECT COUNT(*) FROM event_participants) AS event_participants
    `),
    safeRow(`
      WITH rollup AS (
        SELECT c.id, COUNT(m.id) AS messages, COUNT(DISTINCT m.sender_id) AS senders,
          MAX(m.created_at) AS last_message
        FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.id
      )
      SELECT COUNT(*) AS conversations,
        COUNT(*) FILTER (WHERE messages > 0) AS started_conversations,
        COUNT(*) FILTER (WHERE senders >= 2) AS reciprocal_conversations,
        COALESCE(SUM(messages) FILTER (WHERE last_message >= NOW() - INTERVAL '30 days'), 0) AS messages_30d
      FROM rollup
    `),
    safeRow(`
      SELECT COUNT(*) AS impressions_30d,
        COUNT(DISTINCT subject_id) AS unique_exposed_30d
      FROM product_events
      WHERE event_name = 'profile_impression' AND created_at >= NOW() - INTERVAL '30 days'
    `),
    safeRow(`SELECT COUNT(*) AS open_reports FROM user_reports WHERE status IN ('new', 'in_review')`),
    safeRow(`
      SELECT
        (CASE WHEN to_regclass('public.product_events') IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN to_regclass('public.diagnostic_snapshots') IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN to_regclass('public.user_blocks') IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN to_regclass('public.user_reports') IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_matches' AND column_name = 'expires_at') THEN 1 ELSE 0 END +
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_seen_at') THEN 1 ELSE 0 END) AS schema_ready
    `)
  ])

  const metrics: ProductDiagnosticMetrics = {
    accounts: numberValue(core.accounts),
    profileRows: numberValue(core.profile_rows),
    eligibleProfiles: numberValue(core.eligible_profiles),
    profilesWithMedia: numberValue(core.profiles_with_media),
    profilesWithBio: numberValue(core.profiles_with_bio),
    completeProfiles: numberValue(core.complete_profiles),
    uniqueExposed30d: numberValue(exposure.unique_exposed_30d),
    impressions30d: numberValue(exposure.impressions_30d),
    matchRequests: numberValue(core.match_requests),
    pendingMatches: numberValue(core.pending_matches),
    acceptedMatches: numberValue(core.accepted_matches),
    rejectedMatches: numberValue(core.rejected_matches),
    conversations: numberValue(messaging.conversations),
    startedConversations: numberValue(messaging.started_conversations),
    reciprocalConversations: numberValue(messaging.reciprocal_conversations),
    messages30d: numberValue(messaging.messages_30d),
    futureEvents: numberValue(core.future_events),
    eventParticipants: numberValue(core.event_participants),
    openReports: numberValue(reports.open_reports),
    schemaReady: numberValue(schema.schema_ready),
    schemaExpected: 6
  }

  return buildProductDiagnostic(metrics)
}

export async function createMissingProfileShells() {
  await requireAdmin()
  const created = await sql.query<Array<{ id: string }>>(`
    INSERT INTO user_profiles (user_id, display_profile)
    SELECT u.id, FALSE
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = u.id)
    RETURNING id
  `)
  revalidatePath('/admin/diagnostic')
  return { created: created.length }
}
