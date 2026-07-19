import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, getServerSession, enforceMemberContent } = vi.hoisted(() => ({
  query: vi.fn(),
  getServerSession: vi.fn(),
  enforceMemberContent: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('../lib/db', () => ({ sql: { query } }))
vi.mock('next-auth/next', () => ({ getServerSession }))
vi.mock('@/lib/content-safety-service', () => ({ enforceMemberContent }))
vi.mock('@/actions/notification-actions', () => ({ createNotification: vi.fn(), notifyAdmins: vi.fn() }))
vi.mock('@/lib/product-events', () => ({ trackProductEvents: vi.fn() }))
vi.mock('../utils/logger', () => ({ log: vi.fn() }))

import { sendMessage } from '@/actions/conversation-actions'

const conversationId = '550e8400-e29b-41d4-a716-446655440001'
const senderId = '550e8400-e29b-41d4-a716-446655440002'

describe('contact safety in member messaging', () => {
  beforeEach(() => {
    query.mockReset()
    getServerSession.mockReset()
    enforceMemberContent.mockReset()
    getServerSession.mockResolvedValue({ user: { id: senderId, role: 'user' } })
  })

  it('enforces contact safety after authorization but before message persistence', async () => {
    query
      .mockResolvedValueOnce([{ messaging_restricted_until: null }])
      .mockResolvedValueOnce([{ user_id: '550e8400-e29b-41d4-a716-446655440003' }])
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([])
    enforceMemberContent.mockRejectedValue(Object.assign(
      new Error('Pour votre sécurité, les coordonnées ne peuvent pas être partagées.'),
      { code: 'OFF_PLATFORM_CONTACT_BLOCKED' }
    ))

    await expect(sendMessage({ conversationId, senderId, content: '06 12 34 56 78' }))
      .rejects.toMatchObject({ code: 'OFF_PLATFORM_CONTACT_BLOCKED' })

    expect(enforceMemberContent).toHaveBeenCalledWith({
      actorUserId: senderId,
      surface: 'message',
      content: '06 12 34 56 78'
    })
    expect(query.mock.calls.some(([statement]) => String(statement).includes('INSERT INTO messages'))).toBe(false)
  })
})
