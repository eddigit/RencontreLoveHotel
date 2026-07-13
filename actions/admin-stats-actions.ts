'use server'

import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'

export interface AdminStatsData {
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
  onlineUsersNow: number
  activeUsersToday: number
  activeUsersThisWeek: number
  totalMessages: number
  messagesToday: number
  messagesThisWeek: number
  messagesThisMonth: number
  totalEvents: number
  eventsToday: number
  upcomingEvents: number
  eventSubscriptionsToday: number
  totalConversations: number
  conversationsToday: number
  activeConversationsToday: number
  totalMatches: number
  matchRequestsLast24h: number
  acceptedMatchesLast24h: number
  wallActivityLast24h: number
  supportRequestsLast24h: number
  recentActivity: {
    newUsersLast24h: number
    messagesLast24h: number
    eventSubscriptionsLast24h: number
    conversationsLast24h: number
    matchRequestsLast24h: number
    wallActivityLast24h: number
  }
  generatedAt: string
}

type DashboardRow = Record<string, string | number | Date | null>

function count(row: DashboardRow, key: string) {
  return Number(row[key] || 0)
}

export async function getAdminDashboardStats(): Promise<AdminStatsData> {
  await requireAdmin()

  const rows = await sql.query<DashboardRow[]>(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours') AS users_last_24h,
      (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS users_last_7d,
      (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') AS users_last_30d,
      (SELECT COUNT(*) FROM users WHERE last_seen_at >= NOW() - INTERVAL '10 minutes') AS online_users_now,
      (SELECT COUNT(*) FROM users WHERE last_seen_at >= NOW() - INTERVAL '24 hours') AS active_users_last_24h,
      (SELECT COUNT(*) FROM users WHERE last_seen_at >= NOW() - INTERVAL '7 days') AS active_users_last_7d,

      (SELECT COUNT(*) FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE LOWER(COALESCE(up.gender, '')) IN ('male', 'single_male', 'single_man', 'married_male', 'married_man')) AS gender_male,
      (SELECT COUNT(*) FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE LOWER(COALESCE(up.gender, '')) IN ('female', 'single_female', 'single_woman', 'married_female', 'married_woman')) AS gender_female,
      (SELECT COUNT(*) FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE LOWER(COALESCE(up.gender, '')) LIKE 'couple%') AS gender_couple,
      (SELECT COUNT(*) FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE LOWER(COALESCE(up.gender, '')) NOT IN (
          'male', 'single_male', 'single_man', 'married_male', 'married_man',
          'female', 'single_female', 'single_woman', 'married_female', 'married_woman'
        ) AND LOWER(COALESCE(up.gender, '')) NOT LIKE 'couple%') AS gender_other,

      (SELECT COUNT(*) FROM messages) AS total_messages,
      (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours') AS messages_last_24h,
      (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL '7 days') AS messages_last_7d,
      (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL '30 days') AS messages_last_30d,

      (SELECT COUNT(*) FROM events) AS total_events,
      (SELECT COUNT(*) FROM events WHERE created_at >= NOW() - INTERVAL '24 hours') AS events_last_24h,
      (SELECT COUNT(*) FROM events
       WHERE (event_date + COALESCE(event_time, '23:59:59'::time)) > NOW()
         AND publication_status = 'published') AS upcoming_events,
      (SELECT COUNT(*) FROM event_participants WHERE created_at >= NOW() - INTERVAL '24 hours') AS event_subscriptions_last_24h,

      (SELECT COUNT(*) FROM conversations) AS total_conversations,
      (SELECT COUNT(*) FROM conversations WHERE created_at >= NOW() - INTERVAL '24 hours') AS conversations_last_24h,
      (SELECT COUNT(DISTINCT conversation_id) FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours') AS active_conversations_last_24h,

      (SELECT COUNT(*) FROM user_matches) AS total_matches,
      (SELECT COUNT(*) FROM user_matches WHERE created_at >= NOW() - INTERVAL '24 hours') AS match_requests_last_24h,
      (SELECT COUNT(*) FROM user_matches WHERE status = 'accepted' AND updated_at >= NOW() - INTERVAL '24 hours') AS accepted_matches_last_24h,

      ((SELECT COUNT(*) FROM wall_posts WHERE created_at >= NOW() - INTERVAL '24 hours') +
       (SELECT COUNT(*) FROM wall_comments WHERE created_at >= NOW() - INTERVAL '24 hours')) AS wall_activity_last_24h,
      ((SELECT COUNT(*) FROM community_feedback WHERE created_at >= NOW() - INTERVAL '24 hours') +
       (SELECT COUNT(*) FROM conciergerie_requests WHERE created_at >= NOW() - INTERVAL '24 hours')) AS support_requests_last_24h,
      NOW() AS generated_at
  `)
  const row = rows[0]
  if (!row) throw new Error('Instantané KPI indisponible')

  const usersToday = count(row, 'users_last_24h')
  const messagesToday = count(row, 'messages_last_24h')
  const eventsToday = count(row, 'events_last_24h')
  const eventSubscriptionsToday = count(row, 'event_subscriptions_last_24h')
  const conversationsToday = count(row, 'conversations_last_24h')
  const matchRequestsLast24h = count(row, 'match_requests_last_24h')
  const wallActivityLast24h = count(row, 'wall_activity_last_24h')

  return {
    totalUsers: count(row, 'total_users'),
    usersToday,
    usersThisWeek: count(row, 'users_last_7d'),
    usersThisMonth: count(row, 'users_last_30d'),
    usersByGender: {
      male: count(row, 'gender_male'),
      female: count(row, 'gender_female'),
      couple: count(row, 'gender_couple'),
      other: count(row, 'gender_other')
    },
    onlineUsersNow: count(row, 'online_users_now'),
    activeUsersToday: count(row, 'active_users_last_24h'),
    activeUsersThisWeek: count(row, 'active_users_last_7d'),
    totalMessages: count(row, 'total_messages'),
    messagesToday,
    messagesThisWeek: count(row, 'messages_last_7d'),
    messagesThisMonth: count(row, 'messages_last_30d'),
    totalEvents: count(row, 'total_events'),
    eventsToday,
    upcomingEvents: count(row, 'upcoming_events'),
    eventSubscriptionsToday,
    totalConversations: count(row, 'total_conversations'),
    conversationsToday,
    activeConversationsToday: count(row, 'active_conversations_last_24h'),
    totalMatches: count(row, 'total_matches'),
    matchRequestsLast24h,
    acceptedMatchesLast24h: count(row, 'accepted_matches_last_24h'),
    wallActivityLast24h,
    supportRequestsLast24h: count(row, 'support_requests_last_24h'),
    recentActivity: {
      newUsersLast24h: usersToday,
      messagesLast24h: messagesToday,
      eventSubscriptionsLast24h: eventSubscriptionsToday,
      conversationsLast24h: conversationsToday,
      matchRequestsLast24h,
      wallActivityLast24h
    },
    generatedAt: new Date(row.generated_at || Date.now()).toISOString()
  }
}

export async function getRealTimeMetrics() {
  await requireAdmin()

  const rows = await sql.query<Array<{
    active_users_last_5m: string | number
    messages_last_5m: string | number
    errors_last_5m: string | number
    generated_at: string | Date
  }>>(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE last_seen_at >= NOW() - INTERVAL '5 minutes') AS active_users_last_5m,
      (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL '5 minutes') AS messages_last_5m,
      (SELECT COUNT(*) FROM auth_logs WHERE level = 'error' AND created_at >= NOW() - INTERVAL '5 minutes') AS errors_last_5m,
      NOW() AS generated_at
  `)
  const row = rows[0]
  if (!row) throw new Error('Métriques temps réel indisponibles')

  return {
    connectionsLast5Min: Number(row.active_users_last_5m || 0),
    messagesLast5Min: Number(row.messages_last_5m || 0),
    errorsLast5Min: Number(row.errors_last_5m || 0),
    timestamp: new Date(row.generated_at).toISOString()
  }
}
