import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireAdminMock = vi.hoisted(() => vi.fn())

// Mock des dépendances
vi.mock('@/lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('@/lib/server-auth', () => ({
  requireAdmin: requireAdminMock
}))

import { getAdminDashboardStats, getRealTimeMetrics } from '../actions/admin-stats-actions'
import { sql } from '@/lib/db'

describe('Admin Stats Actions', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    requireAdminMock.mockReset()
    requireAdminMock.mockResolvedValue({ id: 'admin-1', role: 'admin' })
  })

  describe('getAdminDashboardStats', () => {
    it('requires admin access before loading dashboard statistics', async () => {
      requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))

      await expect(getAdminDashboardStats()).rejects.toThrow('administrateur')

      expect(sql.query).not.toHaveBeenCalled()
    })

    it('should return complete admin statistics', async () => {
      // Mock des réponses SQL pour toutes les requêtes
      const mockQueries = [
        [{ count: 1500 }], // totalUsers
        [{ count: 12 }],   // usersToday
        [{ count: 45 }],   // usersWeek
        [{ count: 150 }],  // usersMonth
        [{ gender: 'male', count: 800 }, { gender: 'female', count: 600 }, { gender: 'couple', count: 100 }], // gender distribution
        [{ count: 85 }],   // activeUsersToday
        [{ count: 25000 }], // totalMessages
        [{ count: 245 }],  // messagesToday
        [{ count: 1200 }], // messagesWeek
        [{ count: 4500 }], // messagesMonth
        [{ count: 350 }],  // totalEvents
        [{ count: 3 }],    // eventsToday
        [{ count: 25 }],   // upcomingEvents
        [{ count: 18 }],   // eventSubscriptionsToday
        [{ count: 800 }],  // totalConversations
        [{ count: 15 }],   // conversationsToday
        [{ count: 22 }]    // activeConversationsToday
      ]

      // Configuration des mocks pour toutes les requêtes
      mockQueries.forEach((result, index) => {
        ;(sql.query as any).mockResolvedValueOnce(result)
      })

      const stats = await getAdminDashboardStats()

      // Vérifications des statistiques utilisateurs
      expect(stats.totalUsers).toBe(1500)
      expect(stats.usersToday).toBe(12)
      expect(stats.usersThisWeek).toBe(45)
      expect(stats.usersThisMonth).toBe(150)
      expect(stats.activeUsersToday).toBe(85)

      // Vérifications de la répartition par genre
      expect(stats.usersByGender.male).toBe(800)
      expect(stats.usersByGender.female).toBe(600)
      expect(stats.usersByGender.couple).toBe(100)
      expect(stats.usersByGender.other).toBe(0)

      // Vérifications des messages
      expect(stats.totalMessages).toBe(25000)
      expect(stats.messagesToday).toBe(245)
      expect(stats.messagesThisWeek).toBe(1200)
      expect(stats.messagesThisMonth).toBe(4500)

      // Vérifications des événements
      expect(stats.totalEvents).toBe(350)
      expect(stats.eventsToday).toBe(3)
      expect(stats.upcomingEvents).toBe(25)
      expect(stats.eventSubscriptionsToday).toBe(18)

      // Vérifications des conversations
      expect(stats.totalConversations).toBe(800)
      expect(stats.conversationsToday).toBe(15)
      expect(stats.activeConversationsToday).toBe(22)

      // Vérifications de l'activité récente
      expect(stats.recentActivity.newUsersToday).toBe(12)
      expect(stats.recentActivity.messagesLast24h).toBe(245)
      expect(stats.recentActivity.eventSubscriptionsLast24h).toBe(18)
      expect(stats.recentActivity.conversationsLast24h).toBe(15)

      // Vérification que toutes les requêtes SQL ont été appelées
      expect(sql.query).toHaveBeenCalledTimes(17)
    })

    it('should return zeroed stats when database queries fail', async () => {
      ;(sql.query as any).mockRejectedValue(new Error('Database error'))

      const stats = await getAdminDashboardStats()

      expect(stats.totalUsers).toBe(0)
      expect(stats.usersToday).toBe(0)
      expect(stats.totalMessages).toBe(0)
      expect(stats.totalEvents).toBe(0)
      expect(stats.totalConversations).toBe(0)
      expect(stats.usersByGender).toEqual({ male: 0, female: 0, couple: 0, other: 0 })
      expect(stats.recentActivity).toEqual({
        newUsersToday: 0,
        messagesLast24h: 0,
        eventSubscriptionsLast24h: 0,
        conversationsLast24h: 0
      })
    })
  })

  describe('getRealTimeMetrics', () => {
    it('requires admin access before loading real-time metrics', async () => {
      requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))

      await expect(getRealTimeMetrics()).rejects.toThrow('administrateur')

      expect(sql.query).not.toHaveBeenCalled()
    })

    it('should return real-time activity metrics', async () => {
      const mockMetrics = [
        [{ count: 5 }],  // connectionsLast5Min
        [{ count: 12 }], // messagesLast5Min
        [{ count: 1 }]   // errorsLast5Min
      ]

      mockMetrics.forEach((result) => {
        ;(sql.query as any).mockResolvedValueOnce(result)
      })

      const metrics = await getRealTimeMetrics()

      expect(metrics.connectionsLast5Min).toBe(5)
      expect(metrics.messagesLast5Min).toBe(12)
      expect(metrics.errorsLast5Min).toBe(1)
      expect(metrics.timestamp).toBeDefined()
      expect(new Date(metrics.timestamp)).toBeInstanceOf(Date)
    })

    it('should handle missing auth_logs table gracefully', async () => {
      ;(sql.query as any)
        .mockResolvedValueOnce([{ count: 3 }])  // connections
        .mockResolvedValueOnce([{ count: 8 }])  // messages
        .mockRejectedValueOnce(new Error('Table does not exist')) // errors (fallback)

      const metrics = await getRealTimeMetrics()

      expect(metrics.connectionsLast5Min).toBe(3)
      expect(metrics.messagesLast5Min).toBe(8)
      expect(metrics.errorsLast5Min).toBe(0) // fallback value
    })

    it('should return zero values on complete database failure', async () => {
      ;(sql.query as any).mockRejectedValue(new Error('Complete DB failure'))

      const metrics = await getRealTimeMetrics()

      expect(metrics.connectionsLast5Min).toBe(0)
      expect(metrics.messagesLast5Min).toBe(0)
      expect(metrics.errorsLast5Min).toBe(0)
      expect(metrics.timestamp).toBeDefined()
    })
  })
})
