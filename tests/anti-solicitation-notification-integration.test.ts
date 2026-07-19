import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, getServerSession, trackProductEvents } = vi.hoisted(() => ({
  query: vi.fn(),
  getServerSession: vi.fn(),
  trackProductEvents: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('next-auth/next', () => ({ getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/product-events', () => ({ trackProductEvents }))
vi.mock('../utils/logger', () => ({ log: vi.fn() }))

import { sendMessage } from '@/actions/conversation-actions'

const conversationId = '550e8400-e29b-41d4-a716-446655440001'
const senderId = '550e8400-e29b-41d4-a716-446655440002'
const recipientId = '550e8400-e29b-41d4-a716-446655440003'
const adminId = '550e8400-e29b-41d4-a716-446655440004'

describe('member anti-solicitation notification integration', () => {
  beforeEach(() => {
    query.mockReset()
    getServerSession.mockReset()
    trackProductEvents.mockReset()
    getServerSession.mockResolvedValue({ user: { id: senderId, role: 'user' } })
  })

  it('holds a high-risk member message, creates a case, and notifies admins', async () => {
    query
      .mockResolvedValueOnce([{ messaging_restricted_until: null }])
      .mockResolvedValueOnce([{ user_id: recipientId }])
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([
        { id: 'price', keyword: 'tarif', category: 'price', weight: 1, phrase: false, active: true },
        { id: 'sexual', keyword: 'service sexuel', category: 'sexual_service', weight: 6, phrase: true, active: true }
      ])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: 'case-1' }])
      .mockResolvedValueOnce([{ id: adminId }])
      .mockResolvedValueOnce([{ id: 'notification-1' }])

    const result = await sendMessage({
      conversationId,
      senderId,
      content: 'Quel tarif pour un service sexuel ?'
    })

    expect(result).toMatchObject({
      delivery_status: 'held',
      moderation_outcome: 'hold',
      case_id: 'case-1'
    })
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.arrayContaining([
        adminId,
        'moderation_alert',
        'Alerte de sécurité communautaire'
      ])
    )
    expect(JSON.stringify(query.mock.calls.filter(([statement]) =>
      String(statement).includes('INSERT INTO notifications')
    ))).not.toContain('service sexuel')
  })
})
