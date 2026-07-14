import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAdminMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/server-auth', () => ({
  requireAdmin: requireAdminMock
}))

vi.mock('@/lib/db', () => ({
  sql: { query: vi.fn() }
}))

import { sql } from '@/lib/db'
import { getMessagingRecoveryStats } from '@/actions/messaging-recovery-actions'

describe('messaging recovery admin KPIs', () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    requireAdminMock.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    ;(sql.query as any).mockReset()
  })

  it('requires an administrator before reading messaging activity', async () => {
    requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))

    await expect(
      getMessagingRecoveryStats({ scale: 'day', days: 30 })
    ).rejects.toThrow('administrateur')

    expect(sql.query).not.toHaveBeenCalled()
  })

  it('returns member recovery KPIs, comparisons and service activity', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([
        {
          created_today: '6',
          created_previous: '4',
          started_today: '5',
          started_previous: '2',
          messages_today: '28',
          messages_previous: '20',
          active_today: '9',
          active_previous: '7',
          responded_today: '3',
          responded_previous: '1',
          accepted_today: '4',
          accepted_previous: '3',
          service_messages_today: '8',
          service_conversations_today: '2'
        }
      ])
      .mockResolvedValueOnce([
        {
          period: '2026-07-13',
          created_conversations: '0',
          started_conversations: '2',
          messages: '10',
          active_conversations: '3',
          responded_conversations: '1',
          accepted_matches: '1'
        },
        {
          period: '2026-07-14',
          created_conversations: '6',
          started_conversations: '5',
          messages: '28',
          active_conversations: '9',
          responded_conversations: '3',
          accepted_matches: '4'
        }
      ])

    const result = await getMessagingRecoveryStats({ scale: 'day', days: 30 })

    expect(result.summary).toEqual({
      createdConversations: 6,
      startedConversations: 5,
      messages: 28,
      activeConversations: 9,
      respondedConversations: 3,
      responseRate: 60,
      acceptedMatches: 4
    })
    expect(result.previous.responseRate).toBe(50)
    expect(result.service).toEqual({ messages: 8, activeConversations: 2 })
    expect(result.series[0]).toEqual({
      period: '2026-07-13',
      createdConversations: 0,
      startedConversations: 2,
      messages: 10,
      activeConversations: 3,
      respondedConversations: 1,
      responseRate: 50,
      acceptedMatches: 1
    })

    expect(sql.query).toHaveBeenCalledTimes(2)
    const summarySql = (sql.query as any).mock.calls[0][0]
    const seriesSql = (sql.query as any).mock.calls[1][0]
    expect(summarySql).toContain('COUNT(cp.user_id) = 2')
    expect(summarySql).toContain("BOOL_OR(u.role = 'admin')")
    expect(summarySql).toContain('MIN(m.created_at) AS first_message_at')
    expect(summarySql).toContain('COUNT(DISTINCT m.sender_id) AS distinct_senders')
    expect(summarySql).toContain('um.accepted_at')
    expect(seriesSql).toContain('generate_series')
    expect(seriesSql).toContain('COALESCE')
    expect((sql.query as any).mock.calls[1][1]).toEqual([30])
  })

  it('clamps the requested history window and surfaces database failures', async () => {
    ;(sql.query as any).mockRejectedValue(new Error('database unavailable'))

    await expect(
      getMessagingRecoveryStats({ scale: 'day', days: 500 })
    ).rejects.toThrow('Impossible de charger les KPI de messagerie')

    expect((sql.query as any).mock.calls[0][1]).toEqual([90])
  })
})
