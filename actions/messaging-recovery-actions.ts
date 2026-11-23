'use server'

import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'

export type MessagingRecoveryScale = 'day' | 'week' | 'month'

export interface MessagingRecoveryMetrics {
  createdConversations: number
  startedConversations: number
  messages: number
  activeConversations: number
  respondedConversations: number
  responseRate: number
  acceptedMatches: number
}

export interface MessagingRecoveryPoint extends MessagingRecoveryMetrics {
  period: string
}

export interface MessagingRecoveryStats {
  summary: MessagingRecoveryMetrics
  previous: MessagingRecoveryMetrics
  service: {
    messages: number
    activeConversations: number
  }
  series: MessagingRecoveryPoint[]
  generatedAt: string
}

export type MessagingRecoveryTrendStatus = 'recovering' | 'stable' | 'declining'

export interface MessagingRecoveryHistoryPoint {
  period: string
  messages: number
  activeConversations: number
  createdConversations: number
  acceptedMatches: number
}

export interface MessagingRecoveryTrend {
  status: MessagingRecoveryTrendStatus
  changePercent: number
  recentMessages: number
  previousMessages: number
}

export interface MessagingRecoveryHistory {
  startsAt: string | null
  trend: MessagingRecoveryTrend
  engagement: { recentSenders: number; previousSenders: number; recentReciprocalThreads: number; previousReciprocalThreads: number; recentDailyMedian: number; previousDailyMedian: number }
  series: MessagingRecoveryHistoryPoint[]
}

type SummaryRow = Record<string, string | number | null>
type SeriesRow = SummaryRow & { period: string | Date }

const scaleSql: Record<MessagingRecoveryScale, { unit: string; interval: string }> = {
  day: { unit: 'day', interval: '1 day' },
  week: { unit: 'week', interval: '1 week' },
  month: { unit: 'month', interval: '1 month' }
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function responseRate(active: number, responded: number) {
  return active > 0 ? Math.round((responded / active) * 1000) / 10 : 0
}

function mapMetrics(row: SummaryRow, suffix: 'today' | 'previous'): MessagingRecoveryMetrics {
  const createdConversations = toNumber(row[`created_${suffix}`])
  const startedConversations = toNumber(row[`started_${suffix}`])
  const messages = toNumber(row[`messages_${suffix}`])
  const activeConversations = toNumber(row[`active_${suffix}`])
  const respondedConversations = toNumber(row[`responded_${suffix}`])
  const acceptedMatches = toNumber(row[`accepted_${suffix}`])

  return {
    createdConversations,
    startedConversations,
    messages,
    activeConversations,
    respondedConversations,
    responseRate: responseRate(activeConversations, respondedConversations),
    acceptedMatches
  }
}

const conversationCtes = `
  conversation_base AS (
    SELECT
      c.id,
      c.created_at,
      COUNT(DISTINCT cp.user_id)::int AS participant_count,
      BOOL_OR(u.role = 'admin') AS has_admin,
      CASE
        WHEN COUNT(DISTINCT cp.user_id) = 2
          THEN MIN(cp.user_id::text) || ':' || MAX(cp.user_id::text)
        ELSE c.id::text
      END AS conversation_key
    FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    JOIN users u ON u.id = cp.user_id
    GROUP BY c.id, c.created_at
  ),
  accepted_match_conversations AS (
    SELECT DISTINCT cp1.conversation_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2
      ON cp2.conversation_id = cp1.conversation_id
      AND cp2.user_id <> cp1.user_id
    JOIN user_matches um
      ON um.status = 'accepted'
      AND (
        (um.user_id_1 = cp1.user_id AND um.user_id_2 = cp2.user_id)
        OR
        (um.user_id_1 = cp2.user_id AND um.user_id_2 = cp1.user_id)
      )
  ),
  conversation_types AS (
    SELECT
      cb.id,
      cb.created_at,
      cb.conversation_key,
      cb.participant_count = 2
        AND (NOT cb.has_admin OR amc.conversation_id IS NOT NULL) AS is_member,
      cb.has_admin
        AND NOT (cb.participant_count = 2 AND amc.conversation_id IS NOT NULL) AS is_service
    FROM conversation_base cb
    LEFT JOIN accepted_match_conversations amc ON amc.conversation_id = cb.id
  ),
  member_conversations AS (
    SELECT
      ct.conversation_key,
      MIN(ct.created_at) AS created_at
    FROM conversation_types ct
    WHERE ct.is_member
    GROUP BY ct.conversation_key
  ),
  member_messages AS (
    SELECT
      ct.conversation_key,
      m.sender_id,
      m.created_at
    FROM messages m
    JOIN conversation_types ct ON ct.id = m.conversation_id
    WHERE ct.is_member
  ),
  message_rollup AS (
    SELECT
      mm.conversation_key,
      MIN(mm.created_at) AS first_message_at
    FROM member_messages mm
    GROUP BY mm.conversation_key
  )
`

export async function getMessagingRecoveryStats({
  scale = 'day',
  days = 30
}: {
  scale?: MessagingRecoveryScale
  days?: number
} = {}): Promise<MessagingRecoveryStats> {
  await requireAdmin()

  const safeScale: MessagingRecoveryScale = scale in scaleSql ? scale : 'day'
  const safeDays = Math.min(90, Math.max(7, Math.round(Number(days) || 30)))
  const { unit, interval } = scaleSql[safeScale]

  try {
    const summaryQuery = `
      WITH requested_window AS (
        SELECT $1::int AS days
      ),
      period_bounds AS (
        SELECT
          DATE_TRUNC('${unit}', timezone('Europe/Paris', CURRENT_TIMESTAMP)) AS current_start,
          INTERVAL '${interval}' AS period_size
      ),
      window_bounds AS (
        SELECT
          current_start,
          current_start + period_size AS current_end,
          current_start - period_size AS previous_start
        FROM period_bounds
      ),
      ${conversationCtes}
      SELECT
        (SELECT COUNT(*) FROM member_conversations mc, window_bounds wb WHERE timezone('Europe/Paris', mc.created_at) >= wb.current_start AND timezone('Europe/Paris', mc.created_at) < wb.current_end) AS created_today,
        (SELECT COUNT(*) FROM member_conversations mc, window_bounds wb WHERE timezone('Europe/Paris', mc.created_at) >= wb.previous_start AND timezone('Europe/Paris', mc.created_at) < wb.current_start) AS created_previous,
        (SELECT COUNT(*) FROM message_rollup mr, window_bounds wb WHERE timezone('Europe/Paris', mr.first_message_at) >= wb.current_start AND timezone('Europe/Paris', mr.first_message_at) < wb.current_end) AS started_today,
        (SELECT COUNT(*) FROM message_rollup mr, window_bounds wb WHERE timezone('Europe/Paris', mr.first_message_at) >= wb.previous_start AND timezone('Europe/Paris', mr.first_message_at) < wb.current_start) AS started_previous,
        (SELECT COUNT(*) FROM member_messages mm, window_bounds wb WHERE timezone('Europe/Paris', mm.created_at) >= wb.current_start AND timezone('Europe/Paris', mm.created_at) < wb.current_end) AS messages_today,
        (SELECT COUNT(*) FROM member_messages mm, window_bounds wb WHERE timezone('Europe/Paris', mm.created_at) >= wb.previous_start AND timezone('Europe/Paris', mm.created_at) < wb.current_start) AS messages_previous,
        (SELECT COUNT(DISTINCT mm.conversation_key) FROM member_messages mm, window_bounds wb WHERE timezone('Europe/Paris', mm.created_at) >= wb.current_start AND timezone('Europe/Paris', mm.created_at) < wb.current_end) AS active_today,
        (SELECT COUNT(DISTINCT mm.conversation_key) FROM member_messages mm, window_bounds wb WHERE timezone('Europe/Paris', mm.created_at) >= wb.previous_start AND timezone('Europe/Paris', mm.created_at) < wb.current_start) AS active_previous,
        (
          SELECT COUNT(*)
          FROM (
            SELECT mm.conversation_key
            FROM member_messages mm, window_bounds wb
            WHERE timezone('Europe/Paris', mm.created_at) >= wb.current_start
              AND timezone('Europe/Paris', mm.created_at) < wb.current_end
            GROUP BY mm.conversation_key
            HAVING COUNT(DISTINCT mm.sender_id) >= 2
          ) current_exchanges
        ) AS responded_today,
        (
          SELECT COUNT(*)
          FROM (
            SELECT mm.conversation_key
            FROM member_messages mm, window_bounds wb
            WHERE timezone('Europe/Paris', mm.created_at) >= wb.previous_start
              AND timezone('Europe/Paris', mm.created_at) < wb.current_start
            GROUP BY mm.conversation_key
            HAVING COUNT(DISTINCT mm.sender_id) >= 2
          ) previous_exchanges
        ) AS responded_previous,
        (SELECT COUNT(*) FROM user_matches um, window_bounds wb WHERE um.status = 'accepted' AND timezone('Europe/Paris', um.accepted_at) >= wb.current_start AND timezone('Europe/Paris', um.accepted_at) < wb.current_end) AS accepted_today,
        (SELECT COUNT(*) FROM user_matches um, window_bounds wb WHERE um.status = 'accepted' AND timezone('Europe/Paris', um.accepted_at) >= wb.previous_start AND timezone('Europe/Paris', um.accepted_at) < wb.current_start) AS accepted_previous,
        (SELECT COUNT(*) FROM messages m JOIN conversation_types ct ON ct.id = m.conversation_id, window_bounds wb WHERE ct.is_service AND timezone('Europe/Paris', m.created_at) >= wb.current_start AND timezone('Europe/Paris', m.created_at) < wb.current_end) AS service_messages_today,
        (SELECT COUNT(DISTINCT ct.conversation_key) FROM messages m JOIN conversation_types ct ON ct.id = m.conversation_id, window_bounds wb WHERE ct.is_service AND timezone('Europe/Paris', m.created_at) >= wb.current_start AND timezone('Europe/Paris', m.created_at) < wb.current_end) AS service_conversations_today
      FROM requested_window
    `

    const seriesQuery = `
      WITH bounds AS (
        SELECT
          DATE_TRUNC('${unit}', timezone('Europe/Paris', CURRENT_TIMESTAMP) - (($1::int - 1) * INTERVAL '1 day')) AS starts_at,
          DATE_TRUNC('${unit}', timezone('Europe/Paris', CURRENT_TIMESTAMP)) AS ends_at
      ),
      periods AS (
        SELECT generate_series(starts_at, ends_at, INTERVAL '${interval}') AS period
        FROM bounds
      ),
      ${conversationCtes},
      created_counts AS (
        SELECT DATE_TRUNC('${unit}', timezone('Europe/Paris', mc.created_at)) AS period, COUNT(*) AS count
        FROM member_conversations mc
        GROUP BY 1
      ),
      started_counts AS (
        SELECT
          DATE_TRUNC('${unit}', timezone('Europe/Paris', mr.first_message_at)) AS period,
          COUNT(*) AS count
        FROM message_rollup mr
        GROUP BY 1
      ),
      conversation_period_activity AS (
        SELECT
          DATE_TRUNC('${unit}', timezone('Europe/Paris', mm.created_at)) AS period,
          mm.conversation_key,
          COUNT(*) AS message_count,
          COUNT(DISTINCT mm.sender_id) AS sender_count
        FROM member_messages mm
        GROUP BY 1, mm.conversation_key
      ),
      message_counts AS (
        SELECT
          cpa.period,
          SUM(cpa.message_count) AS count,
          COUNT(*) AS active,
          COUNT(*) FILTER (WHERE cpa.sender_count >= 2) AS responded
        FROM conversation_period_activity cpa
        GROUP BY cpa.period
      ),
      match_counts AS (
        SELECT DATE_TRUNC('${unit}', timezone('Europe/Paris', um.accepted_at)) AS period, COUNT(*) AS count
        FROM user_matches um
        WHERE um.status = 'accepted' AND um.accepted_at IS NOT NULL
        GROUP BY 1
      )
      SELECT
        TO_CHAR(p.period, 'YYYY-MM-DD') AS period,
        COALESCE(cc.count, 0) AS created_conversations,
        COALESCE(sc.count, 0) AS started_conversations,
        COALESCE(mc.count, 0) AS messages,
        COALESCE(mc.active, 0) AS active_conversations,
        COALESCE(mc.responded, 0) AS responded_conversations,
        COALESCE(mac.count, 0) AS accepted_matches
      FROM periods p
      LEFT JOIN created_counts cc ON cc.period = p.period
      LEFT JOIN started_counts sc ON sc.period = p.period
      LEFT JOIN message_counts mc ON mc.period = p.period
      LEFT JOIN match_counts mac ON mac.period = p.period
      ORDER BY p.period ASC
    `

    const [summaryRows, seriesRows] = await Promise.all([
      sql.query<SummaryRow[]>(summaryQuery, [safeDays]),
      sql.query<SeriesRow[]>(seriesQuery, [safeDays])
    ])
    const row = summaryRows[0] || {}

    return {
      summary: mapMetrics(row, 'today'),
      previous: mapMetrics(row, 'previous'),
      service: {
        messages: toNumber(row.service_messages_today),
        activeConversations: toNumber(row.service_conversations_today)
      },
      series: seriesRows.map(seriesRow => {
        const startedConversations = toNumber(seriesRow.started_conversations)
        const respondedConversations = toNumber(seriesRow.responded_conversations)

        return {
          period:
            seriesRow.period instanceof Date
              ? seriesRow.period.toISOString().slice(0, 10)
              : String(seriesRow.period),
          createdConversations: toNumber(seriesRow.created_conversations),
          startedConversations,
          messages: toNumber(seriesRow.messages),
          activeConversations: toNumber(seriesRow.active_conversations),
          respondedConversations,
          responseRate: responseRate(
            toNumber(seriesRow.active_conversations),
            respondedConversations
          ),
          acceptedMatches: toNumber(seriesRow.accepted_matches)
        }
      }),
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Erreur lors du chargement des KPI de messagerie:', error)
    throw new Error('Impossible de charger les KPI de messagerie')
  }
}

function trendFromMessages(recentMessages: number, previousMessages: number) {
  const changePercent = previousMessages === 0
    ? recentMessages > 0 ? 100 : 0
    : Math.round(((recentMessages - previousMessages) / previousMessages) * 1000) / 10

  const status: MessagingRecoveryTrendStatus = changePercent > 5
    ? 'recovering'
    : changePercent < -5
      ? 'declining'
      : 'stable'

  return { status, changePercent, recentMessages, previousMessages }
}

export async function getMessagingRecoveryHistory({
  scale = 'week'
}: {
  scale?: MessagingRecoveryScale
} = {}): Promise<MessagingRecoveryHistory> {
  await requireAdmin()

  const safeScale: MessagingRecoveryScale = scale in scaleSql ? scale : 'week'
  const { unit, interval } = scaleSql[safeScale]

  try {
    const historyQuery = `
      WITH ${conversationCtes},
      activity_dates AS (
        SELECT timezone('Europe/Paris', mc.created_at) AS activity_at
        FROM member_conversations mc
        UNION ALL
        SELECT timezone('Europe/Paris', mm.created_at) AS activity_at
        FROM member_messages mm
        UNION ALL
        SELECT timezone('Europe/Paris', um.accepted_at) AS activity_at
        FROM user_matches um
        WHERE um.status = 'accepted' AND um.accepted_at IS NOT NULL
      ),
      bounds AS (
        SELECT
          DATE_TRUNC('${unit}', COALESCE(MIN(activity_at), timezone('Europe/Paris', CURRENT_TIMESTAMP))) AS starts_at,
          DATE_TRUNC('${unit}', timezone('Europe/Paris', CURRENT_TIMESTAMP)) AS ends_at
        FROM activity_dates
      ),
      periods AS (
        SELECT generate_series(starts_at, ends_at, INTERVAL '${interval}') AS period
        FROM bounds
      ),
      created_counts AS (
        SELECT DATE_TRUNC('${unit}', timezone('Europe/Paris', mc.created_at)) AS period, COUNT(*) AS count
        FROM member_conversations mc
        GROUP BY 1
      ),
      message_counts AS (
        SELECT
          DATE_TRUNC('${unit}', timezone('Europe/Paris', mm.created_at)) AS period,
          COUNT(*) AS count,
          COUNT(DISTINCT mm.conversation_key) AS active
        FROM member_messages mm
        GROUP BY 1
      ),
      match_counts AS (
        SELECT DATE_TRUNC('${unit}', timezone('Europe/Paris', um.accepted_at)) AS period, COUNT(*) AS count
        FROM user_matches um
        WHERE um.status = 'accepted' AND um.accepted_at IS NOT NULL
        GROUP BY 1
      )
      SELECT
        TO_CHAR(b.starts_at, 'YYYY-MM-DD') AS starts_at,
        TO_CHAR(p.period, 'YYYY-MM-DD') AS period,
        COALESCE(mc.count, 0) AS messages,
        COALESCE(mc.active, 0) AS active_conversations,
        COALESCE(cc.count, 0) AS created_conversations,
        COALESCE(mac.count, 0) AS accepted_matches
      FROM periods p
      CROSS JOIN bounds b
      LEFT JOIN message_counts mc ON mc.period = p.period
      LEFT JOIN created_counts cc ON cc.period = p.period
      LEFT JOIN match_counts mac ON mac.period = p.period
      ORDER BY p.period ASC
    `

    const comparisonQuery = `
      WITH ${conversationCtes},
      bounds AS (SELECT timezone('Europe/Paris', CURRENT_TIMESTAMP)::date AS today),
      activity AS (
        SELECT timezone('Europe/Paris', m.created_at)::date AS day, m.sender_id, m.conversation_key,
               m.created_at >= ((b.today - 30)::timestamp AT TIME ZONE 'Europe/Paris') AS recent
        FROM member_messages m CROSS JOIN bounds b
        WHERE m.created_at >= ((b.today - 60)::timestamp AT TIME ZONE 'Europe/Paris')
          AND m.created_at < (b.today::timestamp AT TIME ZONE 'Europe/Paris')
      ),
      daily_totals AS (SELECT day, COUNT(*) AS messages FROM activity GROUP BY day),
      calendar AS (
        SELECT days_ago <= 30 AS recent, COALESCE(d.messages, 0) AS messages
        FROM bounds b CROSS JOIN generate_series(1, 60) days_ago
        LEFT JOIN daily_totals d ON d.day = b.today - days_ago
      ),
      reciprocal AS (
        SELECT recent, conversation_key FROM activity
        GROUP BY recent, conversation_key HAVING COUNT(DISTINCT sender_id) >= 2
      )
      SELECT COUNT(*) FILTER (WHERE recent) AS recent_messages,
             COUNT(*) FILTER (WHERE NOT recent) AS previous_messages,
             COUNT(DISTINCT sender_id) FILTER (WHERE recent) AS recent_senders,
             COUNT(DISTINCT sender_id) FILTER (WHERE NOT recent) AS previous_senders,
             (SELECT COUNT(*) FROM reciprocal WHERE recent) AS recent_reciprocal_threads,
             (SELECT COUNT(*) FROM reciprocal WHERE NOT recent) AS previous_reciprocal_threads,
             (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY messages) FROM calendar WHERE recent) AS recent_daily_median,
             (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY messages) FROM calendar WHERE NOT recent) AS previous_daily_median
      FROM activity
    `

    const [historyRows, comparisonRows] = await Promise.all([
      sql.query<SeriesRow[]>(historyQuery),
      sql.query<SummaryRow[]>(comparisonQuery)
    ])
    const comparison = comparisonRows[0] || {}
    const recentMessages = toNumber(comparison.recent_messages)
    const previousMessages = toNumber(comparison.previous_messages)

    return {
      startsAt: historyRows[0]?.starts_at
        ? String(historyRows[0].starts_at)
        : null,
      trend: trendFromMessages(recentMessages, previousMessages),
      engagement: { recentSenders: toNumber(comparison.recent_senders), previousSenders: toNumber(comparison.previous_senders), recentReciprocalThreads: toNumber(comparison.recent_reciprocal_threads), previousReciprocalThreads: toNumber(comparison.previous_reciprocal_threads), recentDailyMedian: toNumber(comparison.recent_daily_median), previousDailyMedian: toNumber(comparison.previous_daily_median) },
      series: historyRows.map(row => ({
        period: row.period instanceof Date
          ? row.period.toISOString().slice(0, 10)
          : String(row.period),
        messages: toNumber(row.messages),
        activeConversations: toNumber(row.active_conversations),
        createdConversations: toNumber(row.created_conversations),
        acceptedMatches: toNumber(row.accepted_matches)
      }))
    }
  } catch (error) {
    console.error('Erreur lors du chargement de l’historique de messagerie:', error)
    throw new Error('Impossible de charger l’historique de messagerie')
  }
}
