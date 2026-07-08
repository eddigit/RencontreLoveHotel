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
