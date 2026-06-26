import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const acceptMatchRequestMock = vi.hoisted(() => vi.fn())
const findOrCreateConversationMock = vi.hoisted(() => vi.fn())
const notifyEventReservationAdminsMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => vi.fn())
const executeQueryMock = vi.hoisted(() => vi.fn())
const logSecurityEventMock = vi.hoisted(() => vi.fn())

vi.mock('next-auth/next', () => ({
  getServerSession: getServerSessionMock
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@/actions/user-actions', () => ({
  acceptMatchRequest: acceptMatchRequestMock
}))

vi.mock('@/actions/conversation-actions', () => ({
  findOrCreateConversation: findOrCreateConversationMock
}))

vi.mock('@/lib/db', () => ({
  sql: sqlMock,
  executeQuery: executeQueryMock
}))

vi.mock('@/lib/event-reservation-notifications', () => ({
  notifyEventReservationAdmins: notifyEventReservationAdminsMock
}))

vi.mock('@/utils/logger', () => ({
  logSecurityEvent: logSecurityEventMock
}))

function jsonPost(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }) as any
}

describe('sensitive API routes', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    acceptMatchRequestMock.mockReset()
    findOrCreateConversationMock.mockReset()
    notifyEventReservationAdminsMock.mockReset()
    notifyEventReservationAdminsMock.mockResolvedValue({ success: true, emailSent: true })
    sqlMock.mockReset()
    executeQueryMock.mockReset()
    logSecurityEventMock.mockReset()
  })

  it('blocks anonymous match acceptance before touching match data', async () => {
    getServerSessionMock.mockResolvedValue(null)
    acceptMatchRequestMock.mockResolvedValue({ success: true })
    findOrCreateConversationMock.mockResolvedValue('conversation-1')

    const { POST } = await import('@/app/api/accept-match/route')
    const response = await POST(
      jsonPost('https://example.test/api/accept-match', {
        requesterId: 'requester-1',
        receiverId: 'receiver-1'
      })
    )

    expect(response.status).toBe(401)
    expect(acceptMatchRequestMock).not.toHaveBeenCalled()
    expect(findOrCreateConversationMock).not.toHaveBeenCalled()
  })

  it('prevents a logged-in user from accepting a match for another receiver', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'receiver-1', role: 'user' }
    })
    acceptMatchRequestMock.mockResolvedValue({ success: true })
    findOrCreateConversationMock.mockResolvedValue('conversation-1')

    const { POST } = await import('@/app/api/accept-match/route')
    const response = await POST(
      jsonPost('https://example.test/api/accept-match', {
        requesterId: 'requester-1',
        receiverId: 'receiver-2'
      })
    )

    expect(response.status).toBe(403)
    expect(acceptMatchRequestMock).not.toHaveBeenCalled()
    expect(findOrCreateConversationMock).not.toHaveBeenCalled()
  })

  it('allows the receiver to accept a pending match and open the conversation', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'receiver-1', role: 'user' }
    })
    acceptMatchRequestMock.mockResolvedValue({ success: true })
    findOrCreateConversationMock.mockResolvedValue('conversation-1')

    const { POST } = await import('@/app/api/accept-match/route')
    const response = await POST(
      jsonPost('https://example.test/api/accept-match', {
        requesterId: 'requester-1',
        receiverId: 'receiver-1'
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, conversationId: 'conversation-1' })
    expect(acceptMatchRequestMock).toHaveBeenCalledWith(
      'requester-1',
      'receiver-1'
    )
    expect(findOrCreateConversationMock).toHaveBeenCalledWith(
      'receiver-1',
      'requester-1'
    )
  })

  it('blocks anonymous event participation before querying the database', async () => {
    getServerSessionMock.mockResolvedValue(null)

    const { POST } = await import('@/app/api/events/[id]/participate/route')
    const response = (await POST(
      jsonPost('https://example.test/api/events/event-1/participate', {
        action: 'join'
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    )) as Response

    expect(response.status).toBe(401)
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('prevents event participation for another user id', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { POST } = await import('@/app/api/events/[id]/participate/route')
    const response = (await POST(
      jsonPost('https://example.test/api/events/event-1/participate', {
        userId: 'user-2',
        action: 'join'
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    )) as Response

    expect(response.status).toBe(403)
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('uses the connected user id when joining an event', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })
    sqlMock
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          max_participants: 3,
          event_date: new Date(Date.now() + 86_400_000).toISOString()
        }
      ])
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([])

    const { POST } = await import('@/app/api/events/[id]/participate/route')
    const response = (await POST(
      jsonPost('https://example.test/api/events/event-1/participate', {
        action: 'join'
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    )) as Response
    const insertValues = sqlMock.mock.calls.at(-1)?.slice(1)

    expect(response.status).toBe(200)
    expect(insertValues?.[1]).toBe('event-1')
    expect(insertValues?.[2]).toBe('user-1')
    expect(notifyEventReservationAdminsMock).toHaveBeenCalledWith({
      action: 'join',
      eventId: 'event-1',
      userId: 'user-1'
    })
  })

  it('requires an admin session before updating verification tokens', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { POST } = await import(
      '@/app/api/internal-update-verification-token/route'
    )
    const response = await POST(
      jsonPost(
        'https://example.test/api/internal-update-verification-token',
        {
          userId: 'target-user',
          token: 'token-value'
        }
      )
    )

    expect(response.status).toBe(403)
    expect(executeQueryMock).not.toHaveBeenCalled()
  })

  it('requires an admin session before creating test events', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { POST } = await import('@/app/api/events/test/route')
    const response = await POST()

    expect(response.status).toBe(403)
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('requires an admin session before duplicating an event', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { POST } = await import(
      '@/app/api/admin/events/[id]/duplicate/route'
    )
    const response = await POST(
      jsonPost('https://example.test/api/admin/events/event-1/duplicate', {
        title: 'Nouvelle date'
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    )

    expect(response.status).toBe(403)
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('requires an admin session before reprogramming an event', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { POST } = await import(
      '@/app/api/admin/events/[id]/reprogram/route'
    )
    const response = await POST(
      jsonPost('https://example.test/api/admin/events/event-1/reprogram', {
        date: new Date(Date.now() + 86_400_000).toISOString()
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    )

    expect(response.status).toBe(403)
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('requires an admin session before listing past admin events', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { GET } = await import('@/app/api/admin/events/past/route')
    const response = await GET()

    expect(response.status).toBe(403)
    expect(sqlMock).not.toHaveBeenCalled()
  })
})
