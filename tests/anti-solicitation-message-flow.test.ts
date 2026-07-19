import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, getServerSession, createNotification, notifyAdmins, trackProductEvents } = vi.hoisted(() => ({
  query: vi.fn(),
  getServerSession: vi.fn(),
  createNotification: vi.fn(),
  notifyAdmins: vi.fn(),
  trackProductEvents: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('../lib/db', () => ({ sql: { query } }))
vi.mock('next-auth/next', () => ({ getServerSession }))
vi.mock('@/lib/notification-service', () => ({
  createNotificationInternal: createNotification,
  notifyAdminsInternal: notifyAdmins
}))
vi.mock('@/lib/product-events', () => ({ trackProductEvents }))
vi.mock('../utils/logger', () => ({ log: vi.fn() }))

import { sendMessage } from '@/actions/conversation-actions'

const conversationId = '550e8400-e29b-41d4-a716-446655440001'
const senderId = '550e8400-e29b-41d4-a716-446655440002'
const recipientId = '550e8400-e29b-41d4-a716-446655440003'

function mockAuthorizedConversation() {
  getServerSession.mockResolvedValue({ user: { id: senderId, role: 'user' } })
  query
    .mockResolvedValueOnce([{ ok: true }])
    .mockResolvedValueOnce([{ user_id: recipientId }])
    .mockResolvedValueOnce([{ ok: true }])
}

describe('anti-solicitation message delivery', () => {
  beforeEach(() => {
    query.mockReset()
    getServerSession.mockReset()
    createNotification.mockReset()
    notifyAdmins.mockReset()
    notifyAdmins.mockResolvedValue({ success: true })
    trackProductEvents.mockReset()
  })

  it('delivers an ordinary message without creating moderation evidence', async () => {
    mockAuthorizedConversation()
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'message-1', content: 'Bonsoir' }])
      .mockResolvedValueOnce([])

    const result = await sendMessage({ conversationId, senderId, content: 'Bonsoir' })

    expect(result).toMatchObject({ id: 'message-1', delivery_status: 'delivered' })
    expect(query.mock.calls.some(([sql]) => String(sql).includes('moderation_queue'))).toBe(false)
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: recipientId }))
  })

  it('holds a high-risk message and notifies moderators without exposing content', async () => {
    mockAuthorizedConversation()
    query
      .mockResolvedValueOnce([
        { id: 'price', keyword: 'tarif', category: 'price', weight: 1, phrase: false, active: true },
        { id: 'sexual', keyword: 'service sexuel', category: 'sexual_service', weight: 6, phrase: true, active: true }
      ])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: 'case-1' }])

    const result = await sendMessage({
      conversationId,
      senderId,
      content: 'Quel tarif pour un service sexuel ?'
    })

    expect(result).toMatchObject({ delivery_status: 'held', case_id: 'case-1', moderation_outcome: 'hold' })
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO messages'))).toBe(false)
    expect(createNotification).not.toHaveBeenCalled()
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { caseId: 'case-1', severity: 'high' }
    }))
    expect(JSON.stringify(notifyAdmins.mock.calls)).not.toContain('service sexuel')
  })

  it('temporarily restricts messaging for a critical solicitation signal', async () => {
    mockAuthorizedConversation()
    query
      .mockResolvedValueOnce([
        { id: 'sexual', keyword: 'prestation sexuelle', category: 'sexual_service', weight: 6, phrase: true, active: true },
        { id: 'cash', keyword: 'cash', category: 'payment', weight: 2, phrase: false, active: true }
      ])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: 'case-critical' }])
      .mockResolvedValueOnce([])

    const result = await sendMessage({
      conversationId,
      senderId,
      content: 'Prestation sexuelle payée cash'
    })

    expect(result).toMatchObject({ delivery_status: 'held', moderation_outcome: 'restrict' })
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('messaging_restricted_until = NOW() + INTERVAL'),
      [senderId]
    )
  })

  it('refuses delivery while a temporary messaging restriction is active', async () => {
    getServerSession.mockResolvedValue({ user: { id: senderId, role: 'user' } })
    query.mockResolvedValueOnce([{ messaging_restricted_until: new Date('2099-01-01T00:00:00Z') }])

    await expect(sendMessage({ conversationId, senderId, content: 'Bonsoir' }))
      .rejects.toThrow('temporairement restreinte')
    expect(query.mock.calls.some(([statement]) => String(statement).includes('INSERT INTO messages'))).toBe(false)
  })

  it('delivers a warning outcome and creates a focused case', async () => {
    mockAuthorizedConversation()
    query
      .mockResolvedValueOnce([
        { id: 'cash', keyword: 'cash', category: 'payment', weight: 2, phrase: false, active: true },
        { id: 'external', keyword: 'whatsapp', category: 'external_contact', weight: 2, phrase: false, active: true }
      ])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: 'message-2', content: 'Cash sur WhatsApp' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'case-2' }])

    const result = await sendMessage({ conversationId, senderId, content: 'Cash sur WhatsApp' })

    expect(result).toMatchObject({
      id: 'message-2',
      delivery_status: 'delivered',
      moderation_outcome: 'warn',
      case_id: 'case-2'
    })
    expect(createNotification).toHaveBeenCalled()
  })
})
