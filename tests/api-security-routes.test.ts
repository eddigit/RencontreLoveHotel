import { beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'fs'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const acceptMatchRequestMock = vi.hoisted(() => vi.fn())
const findOrCreateConversationMock = vi.hoisted(() => vi.fn())
const notifyEventReservationAdminsMock = vi.hoisted(() => vi.fn())
const requestParticipationMock = vi.hoisted(() => vi.fn())
const withdrawParticipationMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => vi.fn())
const executeQueryMock = vi.hoisted(() => vi.fn())
const logSecurityEventMock = vi.hoisted(() => vi.fn())
const blobPutMock = vi.hoisted(() => vi.fn())

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

vi.mock('@/lib/event-participation-service', () => ({
  requestParticipation: requestParticipationMock,
  withdrawParticipation: withdrawParticipationMock
}))

vi.mock('@vercel/blob', () => ({
  put: blobPutMock
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

function photoPost(file: File) {
  const formData = new FormData()
  formData.set('photo', file)
  return new Request('https://example.test/api/photos/upload', {
    method: 'POST',
    body: formData
  }) as any
}

describe('sensitive API routes', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    acceptMatchRequestMock.mockReset()
    findOrCreateConversationMock.mockReset()
    notifyEventReservationAdminsMock.mockReset()
    notifyEventReservationAdminsMock.mockResolvedValue({ success: true, emailSent: true })
    requestParticipationMock.mockReset()
    withdrawParticipationMock.mockReset()
    sqlMock.mockReset()
    executeQueryMock.mockReset()
    logSecurityEventMock.mockReset()
    blobPutMock.mockReset()
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
    requestParticipationMock.mockResolvedValueOnce({ success: true, status: 'pending' })

    const { POST } = await import('@/app/api/events/[id]/participate/route')
    const response = (await POST(
      jsonPost('https://example.test/api/events/event-1/participate', {
        action: 'join'
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    )) as Response
    expect(response.status).toBe(200)
    expect(requestParticipationMock).toHaveBeenCalledWith({
      eventId: 'event-1',
      actorId: 'user-1'
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

  it('does not expose the test event creation API in the app router', () => {
    expect(existsSync('app/api/events/test/route.ts')).toBe(false)
    expect(existsSync('app/admin/create-test-events/page.tsx')).toBe(false)
    expect(existsSync('app/admin/create-single-test-event/page.tsx')).toBe(false)
    expect(existsSync('actions/create-test-event.ts')).toBe(false)
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

  it('rejects photo uploads with unsupported MIME types before storage', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { POST } = await import('@/app/api/photos/upload/route')
    const response = await POST(
      photoPost(
        new File(['<svg><script>alert(1)</script></svg>'], 'avatar.svg', {
          type: 'image/svg+xml'
        })
      )
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Format')
    expect(sqlMock).not.toHaveBeenCalled()
    expect(blobPutMock).not.toHaveBeenCalled()
  })

  it('rejects photo uploads when file bytes do not match the declared image type', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { POST } = await import('@/app/api/photos/upload/route')
    const response = await POST(
      photoPost(new File(['not an image'], 'avatar.jpg', { type: 'image/jpeg' }))
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('invalide')
    expect(sqlMock).not.toHaveBeenCalled()
    expect(blobPutMock).not.toHaveBeenCalled()
  })

  it('stores valid photo uploads with a server-controlled extension', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })
    sqlMock.mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([])
    blobPutMock.mockResolvedValue({ url: 'https://blob.example/photo.png' })

    const { POST } = await import('@/app/api/photos/upload/route')
    const response = await POST(
      photoPost(
        new File(
          [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
          'profile.html',
          { type: 'image/png' }
        )
      )
    )

    expect(response.status).toBe(200)
    expect(blobPutMock.mock.calls[0][0]).toMatch(
      /^user-photos\/user-1-\d+\.png$/
    )
  })
})
