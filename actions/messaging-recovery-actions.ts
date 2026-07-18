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

function responseRate(started: number, responded: number) {
  return started > 0 ? Math.round((responded / started) * 1000) / 10 : 0
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
    responseRate: responseRate(startedConversations, respondedConversations),
    acceptedMatches
  }
}

const conversationCtes = `
  conversation_types AS (
    SELECT
      c.id,
      c.created_at,
      COUNT(cp.user_id) = 2 AND NOT BOOL_OR(u.role = 'admin') AS is_member,
      BOOL_OR(u.role = 'admin') AS is_service
    FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    JOIN users u ON u.id = cp.user_id
    GROUP BY c.id, c.created_at
  ),
  message_rollup AS (
    SELECT
      m.conversation_id,
      MIN(m.created_at) AS first_message_at,
      COUNT(DISTINCT m.sender_id) AS distinct_senders
    FROM messages m
    GROUP BY m.conversation_id
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
      ${conversationCtes},
      member_messages AS (
        SELECT m.*
        FROM messages m
        JOIN conversation_types ct ON ct.id = m.conversation_id
        WHERE ct.is_member
      )
      SELECT
        (SELECT COUNT(*) FROM conversation_types ct, window_bounds wb WHERE ct.is_member AND timezone('Europe/Paris', ct.created_at) >= wb.current_start AND timezone('Europe/Paris', ct.created_at) < wb.current_end) AS created_today,
        (SELECT COUNT(*) FROM conversation_types ct, window_bounds wb WHERE ct.is_member AND timezone('Europe/Paris', ct.created_at) >= wb.previous_start AND timezone('Europe/Paris', ct.created_at) < wb.current_start) AS created_previous,
        (SELECT COUNT(*) FROM message_rollup mr JOIN conversation_types ct ON ct.id = mr.conversation_id, window_bounds wb WHERE ct.is_member AND timezone('Europe/Paris', mr.first_message_at) >= wb.current_start AND timezone('Europe/Paris', mr.first_message_at) < wb.current_end) AS started_today,
        (SELECT COUNT(*) FROM message_rollup mr JOIN conversation_types ct ON ct.id = mr.conversation_id, window_bounds wb WHERE ct.is_member AND timezone('Europe/Paris', mr.first_message_at) >= wb.previous_start AND timezone('Europe/Paris', mr.first_message_at) < wb.current_start) AS started_previous,
        (SELECT COUNT(*) FROM member_messages mm, window_bounds wb WHERE timezone('Europe/Paris', mm.created_at) >= wb.current_start AND timezone('Europe/Paris', mm.created_at) < wb.current_end) AS messages_today,
        (SELECT COUNT(*) FROM member_messages mm, window_bounds wb WHERE timezone('Europe/Paris', mm.created_at) >= wb.previous_start AND timezone('Europe/Paris', mm.created_at) < wb.current_start) AS messages_previous,
        (SELECT COUNT(DISTINCT mm.conversation_id) FROM member_messages mm, window_bounds wb WHERE timezone('Europe/Paris', mm.created_at) >= wb.current_start AND timezone('Europe/Paris', mm.created_at) < wb.current_end) AS active_today,
        (SELECT COUNT(DISTINCT mm.conversation_id) FROM member_messages mm, window_bounds wb WHERE timezone('Europe/Paris', mm.created_at) >= wb.previous_start AND timezone('Europe/Paris', mm.created_at) < wb.current_start) AS active_previous,
        (SELECT COUNT(*) FROM message_rollup mr JOIN conversation_types ct ON ct.id = mr.conversation_id, window_bounds wb WHERE ct.is_member AND timezone('Europe/Paris', mr.first_message_at) >= wb.current_start AND timezone('Europe/Paris', mr.first_message_at) < wb.current_end AND mr.distinct_senders >= 2) AS responded_today,
        (SELECT COUNT(*) FROM message_rollup mr JOIN conversation_types ct ON ct.id = mr.conversation_id, window_bounds wb WHERE ct.is_member AND timezone('Europe/Paris', mr.first_message_at) >= wb.previous_start AND timezone('Europe/Paris', mr.first_message_at) < wb.current_start AND mr.distinct_senders >= 2) AS responded_previous,
        (SELECT COUNT(*) FROM user_matches um, window_bounds wb WHERE um.status = 'accepted' AND timezone('Europe/Paris', um.accepted_at) >= wb.current_start AND timezone('Europe/Paris', um.accepted_at) < wb.current_end) AS accepted_today,
        (SELECT COUNT(*) FROM user_matches um, window_bounds wb WHERE um.status = 'accepted' AND timezone('Europe/Paris', um.accepted_at) >= wb.previous_start AND timezone('Europe/Paris', um.accepted_at) < wb.current_start) AS accepted_previous,
        (SELECT COUNT(*) FROM messages m JOIN conversation_types ct ON ct.id = m.conversation_id, window_bounds wb WHERE ct.is_service AND timezone('Europe/Paris', m.created_at) >= wb.current_start AND timezone('Europe/Paris', m.created_at) < wb.current_end) AS service_messages_today,
        (SELECT COUNT(DISTINCT m.conversation_id) FROM messages m JOIN conversation_types ct ON ct.id = m.conversation_id, window_bounds wb WHERE ct.is_service AND timezone('Europe/Paris', m.created_at) >= wb.current_start AND timezone('Europe/Paris', m.created_at) < wb.current_end) AS service_conversations_today
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
        SELECT DATE_TRUNC('${unit}', timezone('Europe/Paris', ct.created_at)) AS period, COUNT(*) AS count
        FROM conversation_types ct
        WHERE ct.is_member
        GROUP BY 1
      ),
      started_counts AS (
        SELECT
          DATE_TRUNC('${unit}', timezone('Europe/Paris', mr.first_message_at)) AS period,
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE mr.distinct_senders >= 2) AS responded
        FROM message_rollup mr
        JOIN conversation_types ct ON ct.id = mr.conversation_id
        WHERE ct.is_member
        GROUP BY 1
      ),
      message_counts AS (
        SELECT
          DATE_TRUNC('${unit}', timezone('Europe/Paris', m.created_at)) AS period,
          COUNT(*) AS count,
          COUNT(DISTINCT m.conversation_id) AS active
        FROM messages m
        JOIN conversation_types ct ON ct.id = m.conversation_id
        WHERE ct.is_member
        GROUP BY 1
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
        COALESCE(sc.responded, 0) AS responded_conversations,
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
          responseRate: responseRate(startedConversations, respondedConversations),
          acceptedMatches: toNumber(seriesRow.accepted_matches)
        }
      })
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
        SELECT timezone('Europe/Paris', ct.created_at) AS activity_at
        FROM conversation_types ct
        WHERE ct.is_member
        UNION ALL
        SELECT timezone('Europe/Paris', m.created_at) AS activity_at
        FROM messages m
        JOIN conversation_types ct ON ct.id = m.conversation_id
        WHERE ct.is_member
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
        SELECT DATE_TRUNC('${unit}', timezone('Europe/Paris', ct.created_at)) AS period, COUNT(*) AS count
        FROM conversation_types ct
        WHERE ct.is_member
        GROUP BY 1
      ),
      message_counts AS (
        SELECT
          DATE_TRUNC('${unit}', timezone('Europe/Paris', m.created_at)) AS period,
          COUNT(*) AS count,
          COUNT(DISTINCT m.conversation_id) AS active
        FROM messages m
        JOIN conversation_types ct ON ct.id = m.conversation_id
        WHERE ct.is_member
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
      member_messages AS (
        SELECT m.created_at
        FROM messages m
        JOIN conversation_types ct ON ct.id = m.conversation_id
        WHERE ct.is_member
      )
      SELECT
        COUNT(*) FILTER (
          WHERE timezone('Europe/Paris', m.created_at) >= timezone('Europe/Paris', CURRENT_TIMESTAMP) - INTERVAL '30 days'
            AND timezone('Europe/Paris', m.created_at) < timezone('Europe/Paris', CURRENT_TIMESTAMP)
        ) AS recent_messages,
        COUNT(*) FILTER (
          WHERE timezone('Europe/Paris', m.created_at) >= timezone('Europe/Paris', CURRENT_TIMESTAMP) - INTERVAL '60 days'
            AND timezone('Europe/Paris', m.created_at) < timezone('Europe/Paris', CURRENT_TIMESTAMP) - INTERVAL '30 days'
        ) AS previous_messages
      FROM member_messages m
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
