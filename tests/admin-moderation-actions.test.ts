import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('@/actions/notification-actions', () => ({
  notifyAdmins: vi.fn().mockResolvedValue({ success: true, notifiedCount: 1 })
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

import {
  createModerationKeyword,
  getModerationDashboard,
  scanRecentMessagesForModeration
} from '../actions/admin-moderation-actions'
import { notifyAdmins } from '@/actions/notification-actions'
import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth/next'

describe('admin moderation actions', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    ;(notifyAdmins as any).mockClear()
    ;(getServerSession as any).mockReset()
    ;(getServerSession as any).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' }
    })
  })

  it('blocks moderation dashboard for non-admin users', async () => {
    ;(getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' }
    })

    await expect(getModerationDashboard()).rejects.toThrow('administrateur')
    expect(sql.query).not.toHaveBeenCalled()
  })

  it('loads a defensive moderation dashboard with counts, rules and queue', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([{ count: '3' }])
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([{ count: '4' }])
      .mockResolvedValueOnce([{ count: '2' }])
      .mockResolvedValueOnce([{ count: '18' }])
      .mockResolvedValueOnce([
        {
          id: 'rule-1',
          keyword: 'spam',
          severity: 'high',
          action: 'escalate',
          active: true
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 'queue-1',
          source_type: 'message',
          severity: 'high',
          status: 'new',
          reason: 'Mot-cle detecte',
          matched_keywords: ['spam']
        }
      ])

    const dashboard = await getModerationDashboard()

    expect(dashboard.counts).toEqual({
      pendingItems: 3,
      highSeverityItems: 1,
      activeKeywords: 4,
      bannedMembers: 2,
      messagesToday: 18
    })
    expect(dashboard.keywordRules[0].keyword).toBe('spam')
    expect(dashboard.recentItems[0].id).toBe('queue-1')
  })

  it('upserts moderation keywords in lowercase', async () => {
    ;(sql.query as any).mockResolvedValueOnce([
      {
        id: 'rule-1',
        keyword: 'insulte',
        severity: 'critical',
        action: 'escalate',
        active: true
      }
    ])

    const rule = await createModerationKeyword({
      keyword: '  Insulte  ',
      severity: 'critical',
      action: 'escalate'
    })

    expect(rule.keyword).toBe('insulte')
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO moderation_keywords'),
      ['insulte', 'critical', 'escalate', 'admin-1']
    )
  })

  it('scans recent messages and notifies admins when rules match', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([
        {
          id: 'rule-1',
          keyword: 'danger',
          severity: 'high',
          action: 'escalate',
          active: true
        }
      ])
      .mockResolvedValueOnce([
        {
          id: '11111111-1111-4111-8111-111111111111',
          conversation_id: '22222222-2222-4222-8222-222222222222',
          sender_id: '33333333-3333-4333-8333-333333333333',
          content: 'message avec danger'
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          conversation_id: '55555555-5555-4555-8555-555555555555',
          sender_id: '66666666-6666-4666-8666-666666666666',
          content: 'message normal'
        }
      ])
      .mockResolvedValueOnce([])

    const result = await scanRecentMessagesForModeration({ limit: 50 })

    expect(result).toEqual({ scanned: 2, flagged: 1, activeKeywords: 1 })
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO moderation_queue'),
      expect.arrayContaining([
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '22222222-2222-4222-8222-222222222222',
        'high'
      ])
    )
    expect(notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'moderation_alert',
        link: '/admin/moderation',
        category: 'moderation'
      })
    )
  })
})
