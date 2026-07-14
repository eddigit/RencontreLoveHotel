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

export interface AdminLoginStatusData {
  admins: AdminLoginRoleStatus
  users: AdminLoginRoleStatus
  unknownFailures24h: number
  recentLogins: AdminRecentLogin[]
  auditAvailable: boolean
  timestamp: string
}

function emptyRoleStatus(): AdminLoginRoleStatus {
  return { total: 0, online: 0, active24h: 0, logins24h: 0, failures24h: 0 }
}

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getAdminDashboardStats(): Promise<AdminStatsData> {
  await requireAdmin()

  try {
    // Helper pour exécuter une requête avec fallback
    const safeQuery = async (query: string, fallback = 0) => {
      try {
        const result = await sql.query(query)
        return result[0]?.count || fallback
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
      acc[row.gender || 'other'] = row.count || 0
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
    console.warn('Dernières connexions indisponibles:', error)
  }

  return {
    admins,
    users,
    unknownFailures24h,
    recentLogins,
    auditAvailable,
    timestamp: new Date().toISOString()
  }
}
