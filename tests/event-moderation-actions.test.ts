import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAdminMock = vi.hoisted(() => vi.fn())
const requireCurrentUserMock = vi.hoisted(() => vi.fn())
const requireSameUserOrAdminMock = vi.hoisted(() => vi.fn())
const createAppNotificationMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => {
  const fn = vi.fn()
  return Object.assign(fn, { query: vi.fn() })
})

vi.mock('@/lib/server-auth', () => ({
  requireAdmin: requireAdminMock,
  requireCurrentUser: requireCurrentUserMock,
  requireSameUserOrAdmin: requireSameUserOrAdminMock
}))

vi.mock('@/lib/db', () => ({ sql: sqlMock }))

vi.mock('@/lib/notification-service', () => ({
  createAppNotificationRecord: createAppNotificationMock
}))

vi.mock('@/lib/event-reservation-notifications', () => ({
  notifyEventReservationAdmins: vi.fn()
}))

vi.mock('@/lib/member-activity-email', () => ({
  sendMemberActivityEmail: vi.fn().mockResolvedValue({ sent: false, reason: 'test' })
}))

describe('event moderation actions', () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    requireCurrentUserMock.mockReset()
    requireSameUserOrAdminMock.mockReset()
    createAppNotificationMock.mockReset()
    sqlMock.mockReset()
    sqlMock.query.mockReset()
    requireAdminMock.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    createAppNotificationMock.mockResolvedValue({ success: true })
  })

  it('reads only pending proposals behind the admin guard', async () => {
    sqlMock.query.mockResolvedValueOnce([{ id: 'event-1', publication_status: 'pending_review' }])

    const { getPendingEventModeration } = await import('@/actions/event-actions')
    const rows = await getPendingEventModeration()

    expect(rows).toEqual([{ id: 'event-1', publication_status: 'pending_review' }])
    expect(sqlMock.query).toHaveBeenCalledWith(
      expect.stringContaining("publication_status = 'pending_review'"),
      []
    )
  })

  it('publishes a pending event and notifies its creator', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{ id: 'event-1', creator_id: 'member-1', title: 'Apéro jacuzzi', publication_status: 'pending_review' }])
      .mockResolvedValueOnce([{ id: 'event-1', publication_status: 'published' }])

    const { moderateEvent } = await import('@/actions/event-actions')
    const result = await moderateEvent('event-1', 'publish')

    expect(result).toEqual({ success: true, status: 'published' })
    expect(createAppNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'member-1',
      type: 'event_moderation'
    }))
  })

  it('requires a note when asking for correction or rejecting', async () => {
    const { moderateEvent } = await import('@/actions/event-actions')

    await expect(moderateEvent('event-1', 'request_correction', ''))
      .rejects.toThrow('note')
    expect(sqlMock.query).not.toHaveBeenCalled()
  })
})
