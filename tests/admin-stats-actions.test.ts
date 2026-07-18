import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAdminMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({ sql: { query: vi.fn() } }))
vi.mock('@/lib/server-auth', () => ({ requireAdmin: requireAdminMock }))

import {
  getAdminDashboardStats,
  getAdminLoginStatus,
  getRealTimeMetrics
} from '../actions/admin-stats-actions'
import { sql } from '@/lib/db'

describe('admin KPI actions', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    requireAdminMock.mockReset()
    requireAdminMock.mockResolvedValue({ id: 'admin-1', role: 'admin' })
  })

  it('requires admin access before loading dashboard statistics', async () => {
    requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))
    await expect(getAdminDashboardStats()).rejects.toThrow('administrateur')
    expect(sql.query).not.toHaveBeenCalled()
  })

  it('maps one coherent database snapshot into explicit KPI windows', async () => {
    ;(sql.query as any).mockResolvedValueOnce([{
      total_users: '1349', users_last_24h: '0', users_last_7d: '17', users_last_30d: '41',
      online_users_now: '1', active_users_last_24h: '6', active_users_last_7d: '39',
      gender_male: '763', gender_female: '201', gender_couple: '77', gender_other: '308',
      total_messages: '444', messages_last_24h: '0', messages_last_7d: '16', messages_last_30d: '28',
      total_events: '31', events_last_24h: '0', upcoming_events: '4', event_subscriptions_last_24h: '0',
      total_conversations: '327', conversations_last_24h: '0', active_conversations_last_24h: '0',
      total_matches: '2787', match_requests_last_24h: '10', accepted_matches_last_24h: '0',
      wall_activity_last_24h: '0', support_requests_last_24h: '0',
      generated_at: new Date('2026-07-11T14:00:00Z')
    }])

    const stats = await getAdminDashboardStats()

    expect(stats.totalUsers).toBe(1349)
    expect(stats.onlineUsersNow).toBe(1)
    expect(stats.activeUsersToday).toBe(6)
    expect(stats.activeUsersThisWeek).toBe(39)
    expect(stats.matchRequestsLast24h).toBe(10)
    expect(stats.usersByGender).toEqual({ male: 763, female: 201, couple: 77, other: 308 })
    expect(stats.recentActivity.matchRequestsLast24h).toBe(10)
    expect(stats.generatedAt).toBe('2026-07-11T14:00:00.000Z')
    expect(sql.query).toHaveBeenCalledTimes(1)
  })

  it('surfaces database failures instead of reporting fake zero activity', async () => {
    ;(sql.query as any).mockRejectedValue(new Error('Database unavailable'))
    await expect(getAdminDashboardStats()).rejects.toThrow('Database unavailable')
  })

  it('measures real-time members from presence', async () => {
    ;(sql.query as any).mockResolvedValueOnce([{
      active_users_last_5m: '2',
      messages_last_5m: '1',
      errors_last_5m: '0',
      generated_at: new Date('2026-07-11T14:01:00Z')
    }])

    await expect(getRealTimeMetrics()).resolves.toEqual({
      connectionsLast5Min: 2,
      messagesLast5Min: 1,
      errorsLast5Min: 0,
      timestamp: '2026-07-11T14:01:00.000Z'
    })
    expect(sql.query).toHaveBeenCalledWith(expect.stringContaining('last_seen_at'))
  })

  it('requires admin access before loading real-time metrics', async () => {
    requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))
    await expect(getRealTimeMetrics()).rejects.toThrow('administrateur')
    expect(sql.query).not.toHaveBeenCalled()
  })

  describe('getAdminLoginStatus', () => {
    it('requires admin access before loading login status', async () => {
      requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))

      await expect(getAdminLoginStatus()).rejects.toThrow('administrateur')

      expect(sql.query).not.toHaveBeenCalled()
    })

    it('separates administrator and user login activity', async () => {
      ;(sql.query as any)
        .mockResolvedValueOnce([
          { role: 'admin', total_count: 3, online_count: 1, active_24h_count: 2 },
          { role: 'user', total_count: 120, online_count: 8, active_24h_count: 31 }
        ])
        .mockResolvedValueOnce([{
          admin_login_count: 4,
          user_login_count: 27,
          admin_failure_count: 1,
          user_failure_count: 3,
          total_failure_count: 5
        }])
        .mockResolvedValueOnce([
          {
            id: 'log-1',
            user_id: 'admin-1',
            name: 'Armand',
            email: 'admin@example.com',
            role: 'admin',
            provider: 'credentials',
            created_at: '2026-07-14T19:00:00.000Z'
          }
        ])

      const status = await getAdminLoginStatus()

      expect(status.admins).toEqual({
        total: 3,
        online: 1,
        active24h: 2,
        logins24h: 4,
        failures24h: 1
      })
      expect(status.users).toEqual({
        total: 120,
        online: 8,
        active24h: 31,
        logins24h: 27,
        failures24h: 3
      })
      expect(status.unknownFailures24h).toBe(1)
      expect(status.recentLogins[0]).toMatchObject({
        role: 'admin',
        provider: 'credentials'
      })
      expect(status.auditAvailable).toBe(true)
    })

    it('keeps presence status available when the audit table is unavailable', async () => {
      ;(sql.query as any)
        .mockResolvedValueOnce([
          { role: 'user', total_count: 12, online_count: 2, active_24h_count: 5 }
        ])
        .mockRejectedValueOnce(new Error('auth_logs missing'))
        .mockRejectedValueOnce(new Error('auth_logs missing'))

      const status = await getAdminLoginStatus()

      expect(status.users.online).toBe(2)
      expect(status.users.logins24h).toBe(0)
      expect(status.recentLogins).toEqual([])
      expect(status.auditAvailable).toBe(false)
    })
  })
})
