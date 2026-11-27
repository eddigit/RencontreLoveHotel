'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { eligibleMemberPhotoSql } from '@/lib/member-photo'
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

async function queryRow(query: string) {
  return (await sql.query<any[]>(query))[0] || {}
}

export async function getProductDiagnostic(): Promise<ProductDiagnostic> {
  await requireAdmin()

  const [core, messaging, exposure, reports, schema] = await Promise.all([
    queryRow(`
      WITH eligible AS (
        SELECT u.id, u.avatar, up.age, up.location, up.bio
        FROM users u JOIN user_profiles up ON up.user_id = u.id
        WHERE up.display_profile IS TRUE AND u.onboarding_completed IS TRUE
          AND NOT COALESCE(u.is_banned, FALSE) AND COALESCE(u.status, 'active') = 'active'
      )
      SELECT
        (SELECT COUNT(*) FROM users) AS accounts,
        (SELECT COUNT(*) FROM user_profiles) AS profile_rows,
        (SELECT COUNT(*) FROM eligible) AS eligible_profiles,
        (SELECT COUNT(*) FROM eligible e LEFT JOIN LATERAL (
          SELECT url FROM photos WHERE user_id = e.id AND is_primary IS TRUE ORDER BY created_at DESC,id LIMIT 1
        ) p ON TRUE WHERE ${eligibleMemberPhotoSql("COALESCE(p.url, NULLIF(TRIM(e.avatar), ''))", "p.url IS NOT NULL")}) AS profiles_with_media,
        (SELECT COUNT(*) FROM eligible WHERE NULLIF(TRIM(bio), '') IS NOT NULL) AS profiles_with_bio,
        (SELECT COUNT(*) FROM eligible WHERE age IS NOT NULL AND NULLIF(TRIM(location), '') IS NOT NULL AND NULLIF(TRIM(bio), '') IS NOT NULL) AS complete_profiles,
        (SELECT COUNT(*) FROM user_matches) AS match_requests,
        (SELECT COUNT(*) FROM user_matches WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())) AS pending_matches,
        (SELECT COUNT(*) FROM user_matches WHERE status = 'accepted') AS accepted_matches,
        (SELECT COUNT(*) FROM user_matches WHERE status = 'rejected' OR (status = 'pending' AND expires_at <= NOW())) AS rejected_matches,
        (SELECT COUNT(*) FROM events e WHERE (e.event_date::date + COALESCE(e.event_time::time, TIME '23:59:59')) > (NOW() AT TIME ZONE 'Europe/Paris') AND COALESCE(to_jsonb(e)->>'publication_status', 'published') = 'published') AS future_events,
        (SELECT COUNT(*) FROM event_participants) AS event_participants
    `),
    queryRow(`
      WITH rollup AS (
        SELECT c.id, COUNT(m.id) AS messages, COUNT(DISTINCT m.sender_id) AS senders,
          COUNT(m.id) FILTER (WHERE m.created_at >= NOW() - INTERVAL '30 days') AS messages_30d
        FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.id
      )
      SELECT COUNT(*) AS conversations,
        COUNT(*) FILTER (WHERE messages > 0) AS started_conversations,
        COUNT(*) FILTER (WHERE senders >= 2) AS reciprocal_conversations,
        COALESCE(SUM(messages_30d), 0) AS messages_30d
      FROM rollup
    `),
    queryRow(`
      SELECT COUNT(*) AS impressions_30d,
        COUNT(DISTINCT subject_id) AS unique_exposed_30d
      FROM product_events
      WHERE event_name = 'profile_impression' AND created_at >= NOW() - INTERVAL '30 days'
    `),
    queryRow(`SELECT COUNT(*) AS open_reports FROM user_reports WHERE status IN ('new', 'in_review')`),
    queryRow(`
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
