import { beforeEach, describe, expect, it, vi } from 'vitest'

const sqlQueryMock = vi.hoisted(() => vi.fn())
const requireCurrentUserMock = vi.hoisted(() => vi.fn())
const assertUsersCanInteractMock = vi.hoisted(() => vi.fn())
const createNotificationMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({
  sql: { query: sqlQueryMock }
}))

vi.mock('@/lib/server-auth', () => ({
  requireCurrentUser: requireCurrentUserMock
}))

vi.mock('@/lib/member-safety', () => ({
  assertUsersCanInteract: assertUsersCanInteractMock
}))

vi.mock('@/lib/notification-service', () => ({
  createAppNotificationRecord: createNotificationMock
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('event participation actions', () => {
  beforeEach(() => {
    sqlQueryMock.mockReset()
    requireCurrentUserMock.mockReset()
    requireCurrentUserMock.mockResolvedValue({ id: 'member-1', role: 'user' })
    assertUsersCanInteractMock.mockReset()
    assertUsersCanInteractMock.mockResolvedValue(undefined)
    createNotificationMock.mockReset()
    createNotificationMock.mockResolvedValue({ success: true })
  })

  it('creates a pending request and notifies the organizer', async () => {
    sqlQueryMock
      .mockResolvedValueOnce([{
        id: 'event-1',
        creator_id: 'owner-1',
        title: 'Rideaux ouverts vendredi',
        publication_status: 'published',
        is_upcoming: true
      }])
      .mockResolvedValueOnce([{ id: 'request-1', status: 'pending' }])

    const { requestEventParticipation } = await import('@/actions/event-participation-actions')
    const result = await requestEventParticipation('event-1')

    expect(result).toEqual({ success: true, status: 'pending' })
    expect(assertUsersCanInteractMock).toHaveBeenCalledWith('member-1', 'owner-1')
    expect(createNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'owner-1',
      type: 'event_participation_request',
      link: '/events?view=owned'
    }))
  })

  it('does not create a participation request for the organizer', async () => {
    sqlQueryMock.mockResolvedValueOnce([{
      id: 'event-1',
      creator_id: 'member-1',
      title: 'Apéro jacuzzi',
      publication_status: 'published',
      is_upcoming: true
    }])

    const { requestEventParticipation } = await import('@/actions/event-participation-actions')
    const result = await requestEventParticipation('event-1')

    expect(result).toEqual({ success: false, error: 'Vous organisez déjà cet événement.' })
    expect(sqlQueryMock).toHaveBeenCalledTimes(1)
    expect(createNotificationMock).not.toHaveBeenCalled()
  })

  it('allows the organizer to accept a pending request', async () => {
    requireCurrentUserMock.mockResolvedValue({ id: 'owner-1', role: 'user' })
    sqlQueryMock
      .mockResolvedValueOnce([{
        id: 'request-1',
        event_id: 'event-1',
        user_id: 'member-1',
        status: 'pending',
        creator_id: 'owner-1',
        title: 'Apéro jacuzzi'
      }])
      .mockResolvedValueOnce([{ id: 'request-1', status: 'accepted' }])

    const { decideEventParticipation } = await import('@/actions/event-participation-actions')
    const result = await decideEventParticipation('request-1', 'accept')

    expect(result).toEqual({ success: true, status: 'accepted' })
    expect(sqlQueryMock.mock.calls[1][0]).toContain("status = 'accepted'")
    expect(sqlQueryMock.mock.calls[1][0]).toContain("accepted_count < e.max_participants")
    expect(createNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'member-1',
      type: 'event_participation_decision',
      link: '/events?view=participating'
    }))
  })

  it('refuses organizer decisions from another member', async () => {
    sqlQueryMock.mockResolvedValueOnce([{
      id: 'request-1',
      event_id: 'event-1',
      user_id: 'member-2',
      status: 'pending',
      creator_id: 'owner-1',
      title: 'Apéro jacuzzi'
    }])

    const { decideEventParticipation } = await import('@/actions/event-participation-actions')

    await expect(decideEventParticipation('request-1', 'accept')).rejects.toThrow(
      'Action réservée à l’organisateur'
    )
    expect(sqlQueryMock).toHaveBeenCalledTimes(1)
  })

  it('withdraws only the current member participation', async () => {
    sqlQueryMock.mockResolvedValueOnce([{ id: 'request-1', status: 'withdrawn' }])

    const { withdrawEventParticipation } = await import('@/actions/event-participation-actions')
    const result = await withdrawEventParticipation('event-1')

    expect(result).toEqual({ success: true, status: 'withdrawn' })
    expect(sqlQueryMock.mock.calls[0][1]).toEqual(['event-1', 'member-1'])
  })
})
