'use server'

import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'

export interface AdminStatsData {
  // Utilisateurs
  totalUsers: number
  usersToday: number
  usersThisWeek: number
  usersThisMonth: number
  usersByGender: {
    male: number
    female: number
    couple: number
    other: number
  }
  activeUsersToday: number

  // Messages
  totalMessages: number
  messagesToday: number
  messagesThisWeek: number
  messagesThisMonth: number

  // Événements
  totalEvents: number
  eventsToday: number
  upcomingEvents: number
  eventSubscriptionsToday: number

  // Matches/Conversations
  totalConversations: number
  conversationsToday: number
  activeConversationsToday: number

  // Activité récente
  recentActivity: {
    newUsersToday: number
    messagesLast24h: number
    eventSubscriptionsLast24h: number
    conversationsLast24h: number
  }
}

export interface AdminLoginRoleStatus {
  total: number
  online: number
  active24h: number
  logins24h: number
  failures24h: number
}

export interface AdminRecentLogin {
  id: string
  userId: string | null
  name: string | null
  email: string | null
  role: 'admin' | 'user'
  provider: string
  createdAt: string
}

export interface AdminRecentActivity {
  userId: string
  name: string | null
  email: string
  role: 'admin' | 'user'
  lastSeenAt: string
  online: boolean
}

export interface AdminLoginStatusData {
  admins: AdminLoginRoleStatus
  users: AdminLoginRoleStatus
  unknownFailures24h: number
  recentLogins: AdminRecentLogin[]
  recentActivity: AdminRecentActivity[]
  presenceAvailable: boolean
  activityAvailable: boolean
  auditAvailable: boolean
  timestamp: string
}

export type AdminStatsPeriodDays = 7 | 30 | 90

export interface AdminMemberEngagement {
  userId: string
  name: string | null
  email: string
  role: 'admin' | 'user'
  lastSeenAt: string | null
  online: boolean
  /** Distinct Paris calendar days with a recorded sign-in, outgoing message, or last presence. */
  activeDays: number
  successfulLogins: number
  messagesSent: number
  /** Recipient metrics are calculated only for two-member conversations. */
  messagesReceived: number
  deliveredMessages: number
  readMessages: number
  unreadMessages: number
  repliedConversations: number
  emailNewsOptIn: boolean | null
  emailActivityCategories: { messages: boolean; matches: boolean; events: boolean } | null
}

export interface AdminMemberEngagementStats {
  periodDays: AdminStatsPeriodDays
  periodStart: string
  periodEnd: string
  accounts: {
    total: number
    online: number
    active: number
  }
  /** Anonymous traffic is not recorded by the application database. */
  anonymousVisitors: {
    tracked: 'external'
    detail: string
    audienceUrl: string
  }
  messages: {
    sent: number
    delivered: number
    pendingDelivery: number
    read: number
    unread: number
  }
  members: AdminMemberEngagement[]
  presenceAvailable: boolean
  presenceHistoryAvailable: boolean
  authAuditAvailable: boolean
  messageReceiptsAvailable: boolean
  emailPreferencesAvailable: boolean
  timestamp: string
}

function emptyRoleStatus(): AdminLoginRoleStatus {
  return { total: 0, online: 0, active24h: 0, logins24h: 0, failures24h: 0 }
}

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizePeriodDays(value: number): AdminStatsPeriodDays {
  if (value === 7 || value === 30 || value === 90) return value
  return 30
}

function emptyMemberEngagementStats(periodDays: AdminStatsPeriodDays, periodStart: Date, periodEnd: Date): AdminMemberEngagementStats {
  return {
    periodDays,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    accounts: { total: 0, online: 0, active: 0 },
    anonymousVisitors: {
      tracked: 'external',
      detail: 'L’audience web est mesurée dans Vercel Analytics. Les visiteurs anonymes ne sont pas distinguables individuellement et ne sont pas rattachables à un compte membre.',
      audienceUrl: 'https://vercel.com/gilles-korzec-projects/love-hotel-rencontre/analytics'
    },
    messages: { sent: 0, delivered: 0, pendingDelivery: 0, read: 0, unread: 0 },
    members: [],
    presenceAvailable: false,
    presenceHistoryAvailable: false,
    authAuditAvailable: false,
    messageReceiptsAvailable: false,
    emailPreferencesAvailable: false,
    timestamp: new Date().toISOString()
  }
}

/**
 * Admin-only, content-free engagement report. It deliberately measures only
 * recorded account activity; anonymous visits have no durable identifier here.
 */
export async function getAdminMemberEngagementStats(
  requestedPeriodDays: number = 30
): Promise<AdminMemberEngagementStats> {
  await requireAdmin()

  const periodDays = normalizePeriodDays(requestedPeriodDays)
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const empty = emptyMemberEngagementStats(periodDays, periodStart, periodEnd)

  try {
    const memberRows = await sql.query<any[]>(`
      SELECT
        u.id AS user_id,
        u.name,
        u.email,
        CASE WHEN u.role = 'admin' THEN 'admin' ELSE 'user' END AS role,
        u.last_seen_at,
        (u.last_seen_at >= NOW() - INTERVAL '10 minutes') AS online
      FROM users u
      ORDER BY u.name ASC NULLS LAST, u.email ASC
    `)

    const members: AdminMemberEngagement[] = memberRows.map(row => ({
      userId: String(row.user_id),
      name: row.name ? String(row.name) : null,
      email: String(row.email),
      role: row.role === 'admin' ? 'admin' as const : 'user' as const,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
      online: Boolean(row.online),
      activeDays: 0,
      successfulLogins: 0,
      messagesSent: 0,
      messagesReceived: 0,
      deliveredMessages: 0,
      readMessages: 0,
      unreadMessages: 0,
      repliedConversations: 0,
      emailNewsOptIn: null,
      emailActivityCategories: null
    }))
    const byUserId = new Map(members.map(member => [member.userId, member]))

    empty.members = members
    empty.accounts.total = members.length
    empty.accounts.online = members.filter(member => member.online).length
    empty.presenceAvailable = true

    try {
      const preferenceRows = await sql.query<any[]>(`
        SELECT u.id::text AS user_id, ep.campaign_opt_in, ep.message_email_enabled,
               ep.match_email_enabled, ep.event_email_enabled
        FROM users u
        LEFT JOIN email_preferences ep ON ep.user_id = u.id
      `)
      for (const row of preferenceRows) {
        const member = byUserId.get(String(row.user_id))
        if (member) {
          member.emailNewsOptIn = row.campaign_opt_in === null || row.campaign_opt_in === undefined ? false : Boolean(row.campaign_opt_in)
          member.emailActivityCategories = {
            messages: Boolean(row.message_email_enabled),
            matches: Boolean(row.match_email_enabled),
            events: Boolean(row.event_email_enabled)
          }
        }
      }
      empty.emailPreferencesAvailable = true
    } catch (error) {
      console.warn('Préférences e-mail indisponibles:', error)
    }

    const activeDaysByUser = new Map<string, Set<string>>()
    const addActiveDay = (userId: string, value: unknown) => {
      const date = String(value)
      if (!date) return
      const days = activeDaysByUser.get(userId) || new Set<string>()
      days.add(date)
      activeDaysByUser.set(userId, days)
    }

    // last_seen_at is a current-presence marker, not a session history. It can
    // therefore contribute at most one day to the selected period.
    for (const row of memberRows) {
      if (row.last_seen_at && new Date(row.last_seen_at) >= periodStart) {
        addActiveDay(String(row.user_id), new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date(row.last_seen_at)))
      }
    }

    try {
      const presenceDayRows = await sql.query<any[]>(`
        SELECT user_id::text AS user_id, active_day::text AS active_day
        FROM member_presence_days
        WHERE active_day >= $1::date
          AND active_day <= $2::date
      `, [periodStart.toISOString(), periodEnd.toISOString()])
      for (const row of presenceDayRows) addActiveDay(String(row.user_id), row.active_day)
      empty.presenceHistoryAvailable = true
    } catch (error) {
      console.warn('Historique journalier de présence indisponible:', error)
    }

    try {
      const authRows = await sql.query<any[]>(`
        SELECT
          COALESCE(u.id, al.user_id)::text AS user_id,
          COUNT(*)::int AS successful_logins,
          ARRAY_AGG(DISTINCT timezone('Europe/Paris', al.created_at)::date::text) AS active_days
        FROM auth_logs al
        LEFT JOIN users u
          ON u.id = al.user_id
          OR (al.user_id IS NULL AND LOWER(u.email) = LOWER(al.email))
        WHERE al.event = 'sign_in_success'
          AND al.created_at >= $1
          AND al.created_at < $2
          AND COALESCE(u.id, al.user_id) IS NOT NULL
        GROUP BY COALESCE(u.id, al.user_id)
      `, [periodStart, periodEnd])

      for (const row of authRows) {
        const member = byUserId.get(String(row.user_id))
        if (!member) continue
        member.successfulLogins = asNumber(row.successful_logins)
        for (const day of row.active_days || []) addActiveDay(member.userId, day)
      }
      empty.authAuditAvailable = true
    } catch (error) {
      console.warn("Historique d'authentification indisponible pour les statistiques membres:", error)
    }

    try {
      const messageRows = await sql.query<any[]>(`
        WITH scoped_messages AS (
          SELECT id, conversation_id, sender_id, created_at, delivered_at, COALESCE(is_read, false) AS is_read,
                 timezone('Europe/Paris', created_at)::date::text AS active_day
          FROM messages
          WHERE created_at >= $1
            AND created_at < $2
        ), sender_stats AS (
          SELECT
            sender_id AS user_id,
            COUNT(*)::int AS messages_sent,
            ARRAY_AGG(DISTINCT active_day) AS active_days
          FROM scoped_messages
          GROUP BY sender_id
        ), direct_conversations AS (
          SELECT conversation_id
          FROM conversation_participants
          GROUP BY conversation_id
          HAVING COUNT(*) = 2
        ), recipient_stats AS (
          SELECT
            cp.user_id,
            COUNT(DISTINCT sm.id)::int AS messages_received,
            COUNT(DISTINCT sm.id) FILTER (WHERE sm.delivered_at IS NOT NULL OR sm.is_read)::int AS delivered_messages,
            COUNT(DISTINCT sm.id) FILTER (WHERE sm.is_read)::int AS read_messages,
            COUNT(DISTINCT sm.id) FILTER (WHERE NOT sm.is_read)::int AS unread_messages
          FROM scoped_messages sm
          JOIN direct_conversations dc ON dc.conversation_id = sm.conversation_id
          JOIN conversation_participants cp
            ON cp.conversation_id = sm.conversation_id
           AND cp.user_id <> sm.sender_id
          GROUP BY cp.user_id
        ), response_stats AS (
          SELECT outgoing.sender_id AS user_id, COUNT(DISTINCT outgoing.conversation_id)::int AS replied_conversations
          FROM scoped_messages outgoing
          JOIN direct_conversations dc ON dc.conversation_id = outgoing.conversation_id
          WHERE EXISTS (
            SELECT 1 FROM scoped_messages incoming
            WHERE incoming.conversation_id = outgoing.conversation_id
              AND incoming.sender_id <> outgoing.sender_id
              AND incoming.created_at < outgoing.created_at
          )
          GROUP BY outgoing.sender_id
        )
        SELECT
          u.id::text AS user_id,
          COALESCE(ss.messages_sent, 0)::int AS messages_sent,
          COALESCE(ss.active_days, ARRAY[]::text[]) AS active_days,
          COALESCE(rs.messages_received, 0)::int AS messages_received,
          COALESCE(rs.delivered_messages, 0)::int AS delivered_messages,
          COALESCE(rs.read_messages, 0)::int AS read_messages,
          COALESCE(rs.unread_messages, 0)::int AS unread_messages,
          COALESCE(resp.replied_conversations, 0)::int AS replied_conversations
        FROM users u
        LEFT JOIN sender_stats ss ON ss.user_id = u.id
        LEFT JOIN recipient_stats rs ON rs.user_id = u.id
        LEFT JOIN response_stats resp ON resp.user_id = u.id
      `, [periodStart, periodEnd])

      for (const row of messageRows) {
        const member = byUserId.get(String(row.user_id))
        if (!member) continue
        member.messagesSent = asNumber(row.messages_sent)
        member.messagesReceived = asNumber(row.messages_received)
        member.deliveredMessages = asNumber(row.delivered_messages)
        member.readMessages = asNumber(row.read_messages)
        member.unreadMessages = asNumber(row.unread_messages)
        member.repliedConversations = asNumber(row.replied_conversations)
        for (const day of row.active_days || []) addActiveDay(member.userId, day)
      }

      const totals = await sql.query<any[]>(`
        SELECT
          COUNT(*)::int AS sent,
          COUNT(*) FILTER (WHERE delivered_at IS NOT NULL OR is_read IS TRUE)::int AS delivered,
          COUNT(*) FILTER (WHERE delivered_at IS NULL AND is_read IS NOT TRUE)::int AS pending_delivery,
          COUNT(*) FILTER (WHERE COALESCE(is_read, false))::int AS read,
          COUNT(*) FILTER (WHERE NOT COALESCE(is_read, false))::int AS unread
        FROM messages
        WHERE created_at >= $1
          AND created_at < $2
      `, [periodStart, periodEnd])
      const total = totals[0] || {}
      empty.messages = {
        sent: asNumber(total.sent),
        delivered: asNumber(total.delivered),
        pendingDelivery: asNumber(total.pending_delivery),
        read: asNumber(total.read),
        unread: asNumber(total.unread)
      }
      empty.messageReceiptsAvailable = true
    } catch (error) {
      console.warn('Reçus de livraison et de lecture indisponibles:', error)
    }

    for (const member of members) {
      member.activeDays = activeDaysByUser.get(member.userId)?.size || 0
    }
    empty.accounts.active = members.filter(member => member.activeDays > 0).length

    return empty
  } catch (error) {
    console.error('Statistiques de fréquentation membre indisponibles:', error)
    throw new Error('Données des membres indisponibles')
  }
}

export async function getAdminOverviewCounts() {
  await requireAdmin()

  const rows = await sql.query<any[]>(`
    SELECT
      (SELECT COUNT(*) FROM users)::int AS user_count,
      (
        SELECT COUNT(*)
        FROM events e
        WHERE e.publication_status = 'published'
          AND (
            e.event_date + COALESCE(e.event_time, TIME '23:59:59')
          ) >= timezone('Europe/Paris', CURRENT_TIMESTAMP)
      )::int AS upcoming_event_count
  `)
  const row = rows[0] || {}

  return {
    users: asNumber(row.user_count),
    upcomingEvents: asNumber(row.upcoming_event_count)
  }
}

export async function getAdminDashboardStats(): Promise<AdminStatsData> {
  await requireAdmin()

  try {
    // Helper pour exécuter une requête avec fallback
    const safeQuery = async (query: string, fallback = 0) => {
      try {
        const result = await sql.query(query)
        return asNumber(result[0]?.count ?? fallback)
      } catch (error) {
        console.warn('Requête échouée:', query, error)
        return fallback
      }
    }

    // Helper pour la requête genre avec fallback
    const safeGenderQuery = async () => {
      try {
        const result = await sql.query(`
          SELECT
            gender,
            COUNT(*) as count
          FROM user_profiles
          GROUP BY gender
        `)
        return result
      } catch (error) {
        console.warn('Requête genre échouée:', error)
        return []
      }
    }

    // Statistiques de base (parallèles mais sécurisées)
    const [
      totalUsers,
      usersToday,
      usersWeek,
      usersMonth,
      genderResults,
      activeUsersToday,
      totalMessages,
      messagesToday,
      messagesWeek,
      messagesMonth,
      totalEvents,
      eventsToday,
      upcomingEvents,
      eventSubscriptionsToday,
      totalConversations,
      conversationsToday,
      activeConversationsToday
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*) as count FROM users`),
      safeQuery(`SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE(NOW())`),
      safeQuery(`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`),
      safeQuery(`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '30 days'`),
      safeGenderQuery(),
      safeQuery(`
        SELECT COUNT(DISTINCT sender_id) as count
        FROM messages
        WHERE DATE(created_at) = DATE(NOW())
      `),
      safeQuery(`SELECT COUNT(*) as count FROM messages`),
      safeQuery(`SELECT COUNT(*) as count FROM messages WHERE DATE(created_at) = DATE(NOW())`),
      safeQuery(`SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '7 days'`),
      safeQuery(`SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '30 days'`),
      safeQuery(`SELECT COUNT(*) as count FROM events`),
      safeQuery(`SELECT COUNT(*) as count FROM events WHERE DATE(created_at) = DATE(NOW())`),
      safeQuery(`SELECT COUNT(*) as count FROM events WHERE event_date >= NOW()`),
      safeQuery(`
        SELECT COUNT(*) as count
        FROM event_participants
        WHERE DATE(created_at) = DATE(NOW())
      `),
      safeQuery(`SELECT COUNT(*) as count FROM conversations`),
      safeQuery(`SELECT COUNT(*) as count FROM conversations WHERE DATE(created_at) = DATE(NOW())`),
      safeQuery(`
        SELECT COUNT(DISTINCT conversation_id) as count
        FROM messages
        WHERE DATE(created_at) = DATE(NOW())
      `)
    ])

    // Agrégation des données de genre avec fallback
    const genderStats = (genderResults || []).reduce((acc: any, row: any) => {
      acc[row.gender || 'other'] = asNumber(row.count)
      return acc
    }, { male: 0, female: 0, couple: 0, other: 0 })

    const stats: AdminStatsData = {
      // Utilisateurs
      totalUsers,
      usersToday,
      usersThisWeek: usersWeek,
      usersThisMonth: usersMonth,
      usersByGender: genderStats,
      activeUsersToday,

      // Messages
      totalMessages,
      messagesToday,
      messagesThisWeek: messagesWeek,
      messagesThisMonth: messagesMonth,

      // Événements
      totalEvents,
      eventsToday,
      upcomingEvents,
      eventSubscriptionsToday,

      // Conversations
      totalConversations,
      conversationsToday,
      activeConversationsToday,

      // Activité récente
      recentActivity: {
        newUsersToday: usersToday,
        messagesLast24h: messagesToday,
        eventSubscriptionsLast24h: eventSubscriptionsToday,
        conversationsLast24h: conversationsToday
      }
    }

    return stats

  } catch (error) {
    console.error('Erreur lors du chargement des statistiques admin:', error)
    // Retour de statistiques par défaut en cas d'erreur complète
    return {
      totalUsers: 0,
      usersToday: 0,
      usersThisWeek: 0,
      usersThisMonth: 0,
      usersByGender: { male: 0, female: 0, couple: 0, other: 0 },
      activeUsersToday: 0,
      totalMessages: 0,
      messagesToday: 0,
      messagesThisWeek: 0,
      messagesThisMonth: 0,
      totalEvents: 0,
      eventsToday: 0,
      upcomingEvents: 0,
      eventSubscriptionsToday: 0,
      totalConversations: 0,
      conversationsToday: 0,
      activeConversationsToday: 0,
      recentActivity: {
        newUsersToday: 0,
        messagesLast24h: 0,
        eventSubscriptionsLast24h: 0,
        conversationsLast24h: 0
      }
    }
  }
}

// Fonction pour obtenir des statistiques de performance en temps réel
export async function getRealTimeMetrics() {
  await requireAdmin()

  try {
    // Helper pour requêtes sécurisées
    const safeQuery = async (query: string, fallback = 0) => {
      try {
        const result = await sql.query(query)
        return result[0]?.count || fallback
      } catch (error) {
        console.warn('Requête temps réel échouée:', query, error)
        return fallback
      }
    }

    const [
      connectionsLast5Min,
      messagesLast5Min,
      errorsLast5Min
    ] = await Promise.all([
      // Activité utilisateurs récente (via messages)
      safeQuery(`
        SELECT COUNT(DISTINCT sender_id) as count
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '5 minutes'
      `),

      // Messages dans les 5 dernières minutes
      safeQuery(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '5 minutes'
      `),

      // Table absente sur la beta actuelle : fallback automatique à 0.
      safeQuery(`
        SELECT COUNT(*) as count
        FROM auth_logs
        WHERE level = 'error'
          AND created_at >= NOW() - INTERVAL '5 minutes'
      `)
    ])

    return {
      connectionsLast5Min,
      messagesLast5Min,
      errorsLast5Min,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Erreur lors du chargement des métriques temps réel:', error)
    return {
      connectionsLast5Min: 0,
      messagesLast5Min: 0,
      errorsLast5Min: 0,
      timestamp: new Date().toISOString()
    }
  }
}

export async function getAdminLoginStatus(): Promise<AdminLoginStatusData> {
  await requireAdmin()

  const admins = emptyRoleStatus()
  const users = emptyRoleStatus()
  let unknownFailures24h = 0
  let recentLogins: AdminRecentLogin[] = []
  let recentActivity: AdminRecentActivity[] = []
  let presenceAvailable = true
  let activityAvailable = true
  let auditAvailable = true

  try {
    const presenceRows = await sql.query<any[]>(`
      SELECT
        CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END AS role,
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (
          WHERE last_seen_at >= NOW() - INTERVAL '10 minutes'
        )::int AS online_count,
        COUNT(*) FILTER (
          WHERE last_seen_at >= NOW() - INTERVAL '24 hours'
        )::int AS active_24h_count
      FROM users
      GROUP BY CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END
    `)

    for (const row of presenceRows) {
      const target = row.role === 'admin' ? admins : users
      target.total = asNumber(row.total_count)
      target.online = asNumber(row.online_count)
      target.active24h = asNumber(row.active_24h_count)
    }
  } catch (error) {
    presenceAvailable = false
    console.warn('État de présence indisponible:', error)
  }

  try {
    const auditRows = await sql.query<any[]>(`
      SELECT
        COUNT(*) FILTER (
          WHERE al.event = 'sign_in_success'
            AND COALESCE(u.role, al.metadata->>'role') = 'admin'
        )::int AS admin_login_count,
        COUNT(*) FILTER (
          WHERE al.event = 'sign_in_success'
            AND COALESCE(u.role, al.metadata->>'role', 'user') <> 'admin'
        )::int AS user_login_count,
        COUNT(*) FILTER (
          WHERE al.event = 'sign_in_failure'
            AND COALESCE(u.role, al.metadata->>'role') = 'admin'
        )::int AS admin_failure_count,
        COUNT(*) FILTER (
          WHERE al.event = 'sign_in_failure'
            AND COALESCE(u.role, al.metadata->>'role') IS NOT NULL
            AND COALESCE(u.role, al.metadata->>'role') <> 'admin'
        )::int AS user_failure_count,
        COUNT(*) FILTER (WHERE al.event = 'sign_in_failure')::int AS total_failure_count
      FROM auth_logs al
      LEFT JOIN users u
        ON u.id = al.user_id
        OR (al.user_id IS NULL AND LOWER(u.email) = LOWER(al.email))
      WHERE al.created_at >= NOW() - INTERVAL '24 hours'
    `)
    const audit = auditRows[0] || {}

    admins.logins24h = asNumber(audit.admin_login_count)
    admins.failures24h = asNumber(audit.admin_failure_count)
    users.logins24h = asNumber(audit.user_login_count)
    users.failures24h = asNumber(audit.user_failure_count)
    unknownFailures24h = Math.max(
      0,
      asNumber(audit.total_failure_count) - admins.failures24h - users.failures24h
    )
  } catch (error) {
    auditAvailable = false
    console.warn("Historique d'authentification indisponible:", error)
  }

  try {
    const recentRows = await sql.query<any[]>(`
      SELECT
        al.id,
        COALESCE(u.id, al.user_id) AS user_id,
        u.name,
        COALESCE(u.email, al.email) AS email,
        CASE
          WHEN COALESCE(u.role, al.metadata->>'role') = 'admin' THEN 'admin'
          ELSE 'user'
        END AS role,
        COALESCE(al.metadata->>'provider', 'unknown') AS provider,
        al.created_at
      FROM auth_logs al
      LEFT JOIN users u
        ON u.id = al.user_id
        OR (al.user_id IS NULL AND LOWER(u.email) = LOWER(al.email))
      WHERE al.event = 'sign_in_success'
      ORDER BY al.created_at DESC
      LIMIT 12
    `)

    recentLogins = recentRows.map(row => ({
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : null,
      name: row.name ? String(row.name) : null,
      email: row.email ? String(row.email) : null,
      role: row.role === 'admin' ? 'admin' : 'user',
      provider: String(row.provider || 'unknown'),
      createdAt: new Date(row.created_at).toISOString()
    }))
  } catch (error) {
    auditAvailable = false
    console.warn('Dernières authentifications indisponibles:', error)
  }

  try {
    const activityRows = await sql.query<any[]>(`
      SELECT
        id AS user_id,
        name,
        email,
        CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END AS role,
        last_seen_at,
        (last_seen_at >= NOW() - INTERVAL '10 minutes') AS online
      FROM users
      WHERE last_seen_at IS NOT NULL
      ORDER BY last_seen_at DESC
      LIMIT 12
    `)

    recentActivity = activityRows.map(row => ({
      userId: String(row.user_id),
      name: row.name ? String(row.name) : null,
      email: String(row.email),
      role: row.role === 'admin' ? 'admin' : 'user',
      lastSeenAt: new Date(row.last_seen_at).toISOString(),
      online: Boolean(row.online)
    }))
  } catch (error) {
    activityAvailable = false
    console.warn('Dernière activité indisponible:', error)
  }

  return {
    admins,
    users,
    unknownFailures24h,
    recentLogins,
    recentActivity,
    presenceAvailable,
    activityAvailable,
    auditAvailable,
    timestamp: new Date().toISOString()
  }
}
