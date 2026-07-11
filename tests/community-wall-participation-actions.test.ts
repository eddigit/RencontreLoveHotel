import { beforeEach, describe, expect, it, vi } from 'vitest'

const sqlQueryMock = vi.hoisted(() => vi.fn())
const requireCurrentUserMock = vi.hoisted(() => vi.fn())
const createNotificationMock = vi.hoisted(() => vi.fn())
const findConversationMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({ sql: { query: sqlQueryMock } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser: requireCurrentUserMock }))
vi.mock('@/lib/notification-service', () => ({ createNotificationRecord: createNotificationMock }))
vi.mock('@/actions/conversation-actions', () => ({ findOrCreateConversation: findConversationMock }))
vi.mock('@vercel/blob', () => ({ put: vi.fn() }))

describe('community wall participation workflow', () => {
  beforeEach(() => {
    sqlQueryMock.mockReset()
    requireCurrentUserMock.mockReset()
    requireCurrentUserMock.mockResolvedValue({ id: 'candidate-1', role: 'user' })
    createNotificationMock.mockReset()
    findConversationMock.mockReset()
    findConversationMock.mockResolvedValue('conversation-1')
  })

  it('publishes an unconfirmed proposal but requires a reference when marked reserved', async () => {
    const { createWallPost } = await import('@/actions/community-wall-actions')

    sqlQueryMock
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'post-unconfirmed', status: 'active' }])

    await expect(createWallPost({
      type: 'dispo_rideaux_ouverts',
      body: 'Jeudi soir à Châtelet.',
      venue: 'chatelet',
      startsAt: '2026-08-06T20:00:00.000Z',
      guestCapacity: 2,
      bookingConfirmed: false
    })).resolves.toEqual({ success: true, postId: 'post-unconfirmed', status: 'active' })

    await expect(createWallPost({
      type: 'dispo_rideaux_ouverts',
      body: 'Jeudi soir à Châtelet.',
      venue: 'chatelet',
      roomName: 'Secrets',
      startsAt: '2026-08-06T20:00:00.000Z',
      guestCapacity: 2,
      bookingConfirmed: true,
      bookingReference: ''
    })).rejects.toThrow('référence de réservation')
  })

  it('creates a pending request and notifies the organizer', async () => {
    sqlQueryMock
      .mockResolvedValueOnce([{ id: 'post-1', user_id: 'organizer-1', guest_capacity: 2, accepted_count: '0' }])
      .mockResolvedValueOnce([{ id: 'request-1', status: 'pending' }])
    const { requestWallParticipation } = await import('@/actions/community-wall-actions')

    await expect(requestWallParticipation({ postId: 'post-1', message: 'Nous sommes intéressés.' }))
      .resolves.toEqual({ success: true, requestId: 'request-1', status: 'pending' })
    expect(createNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'organizer-1',
      type: 'wall_participation_request'
    }))
  })

  it('accepts a candidate, creates the relationship and opens a conversation', async () => {
    requireCurrentUserMock.mockResolvedValue({ id: 'organizer-1', role: 'user' })
    sqlQueryMock
      .mockResolvedValueOnce([{
        id: 'request-1',
        user_id: 'candidate-1',
        status: 'pending',
        post_id: 'post-1',
        organizer_id: 'organizer-1',
        guest_capacity: 2
      }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { decideWallParticipationRequest } = await import('@/actions/community-wall-actions')
    await expect(decideWallParticipationRequest({ requestId: 'request-1', decision: 'accepted' }))
      .resolves.toEqual({ success: true, status: 'accepted', conversationId: 'conversation-1' })

    expect(findConversationMock).toHaveBeenCalledWith('organizer-1', 'candidate-1')
    expect(createNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'candidate-1',
      type: 'wall_participation_accepted'
    }))
  })
})
