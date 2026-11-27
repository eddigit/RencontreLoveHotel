import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const notifyEventReservationAdminsMock = vi.hoisted(() => vi.fn())
const reserveEventSeatMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => {
  const fn = vi.fn()
  return Object.assign(fn, { query: vi.fn() })
})

vi.mock('next-auth/next', () => ({
  getServerSession: getServerSessionMock
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@/lib/db', () => ({
  sql: sqlMock
}))

vi.mock('@/lib/event-reservation-notifications', () => ({
  notifyEventReservationAdmins: notifyEventReservationAdminsMock
}))

vi.mock('@/lib/event-participation', () => ({
  reserveEventSeat: reserveEventSeatMock
}))

describe('event actions behavior', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })
    sqlMock.mockReset()
    sqlMock.query.mockReset()
    notifyEventReservationAdminsMock.mockReset()
    notifyEventReservationAdminsMock.mockResolvedValue({ success: true, emailSent: true })
    reserveEventSeatMock.mockReset()
    reserveEventSeatMock.mockResolvedValue('joined')
  })

  it('creates an event with separated event date and event time', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'event-1' }])

    const { createEvent } = await import('@/actions/event-actions')

    const event = await createEvent({
      title: 'Apéro jacuzzi',
      location: 'Love Hotel Pigalle',
      date: '2026-07-10T21:30',
      creator_id: 'user-1',
      venue: 'pigalle',
      experience_type: 'jacuzzi',
      max_participants: 4
    })

    const queryParts = sqlMock.mock.calls[0][0] as TemplateStringsArray
    const values = sqlMock.mock.calls[0].slice(1)

    expect(event).toEqual({ id: 'event-1' })
    expect(queryParts.join('')).toContain('event_date')
    expect(queryParts.join('')).toContain('event_time')
    expect(values).toEqual(
      expect.arrayContaining(['2026-07-10', '21:30:00'])
    )
  })

  it('restricts official circle events to administrators and requires a capacity', async () => {
    const { createEvent } = await import('@/actions/event-actions')
    const outing = {
      title: 'Soirée du cercle', location: 'Lieu de test', date: '2027-05-20T20:00',
      creator_id: 'user-1', experience_type: 'libertine', max_participants: 18
    }
    await expect(createEvent(outing)).rejects.toThrow('réservée')
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1', role: 'admin' } })
    await expect(createEvent({ ...outing, max_participants: 0 })).rejects.toThrow('nombre de places')
    expect(sqlMock).not.toHaveBeenCalled()
    sqlMock.mockResolvedValueOnce([{ id: 'event-1' }])
    await expect(createEvent(outing)).resolves.toEqual({ id: 'event-1' })
    expect(sqlMock.mock.calls[0]).toContain('libertine')
    expect(sqlMock.mock.calls[0]).toContain(18)
  })

  it('rejects unavailable event formats before writing to the database', async () => {
    const { createEvent } = await import('@/actions/event-actions')

    await expect(
      createEvent({
        title: 'Dîner romantique',
        location: 'Love Hotel Pigalle',
        date: '2026-07-10T21:30',
        creator_id: 'user-1',
        category: 'restaurant',
        experience_type: 'restaurant',
        max_participants: 2
      })
    ).rejects.toThrow("pas encore disponible")

    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('rejects jacuzzi events above four couples before writing to the database', async () => {
    const { createEvent } = await import('@/actions/event-actions')

    await expect(
      createEvent({
        title: 'Apéro jacuzzi trop large',
        location: 'Love Hotel Pigalle',
        date: '2026-07-10T21:30',
        creator_id: 'user-1',
        category: 'jacuzzi',
        experience_type: 'jacuzzi',
        max_participants: 5
      })
    ).rejects.toThrow('4 couples')

    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('lets the connected member join a published upcoming event', async () => {
    sqlMock
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          max_participants: 3,
          participant_count: '2',
          event_date: new Date(Date.now() + 86_400_000).toISOString(),
          publication_status: 'published'
        }
      ])

    const { subscribeToEvent } = await import('@/actions/event-actions')

    const result = await subscribeToEvent('event-1', 'user-1')

    expect(result).toEqual({ success: true })
    expect(reserveEventSeatMock).toHaveBeenCalledWith('event-1', 'user-1')
    expect(notifyEventReservationAdminsMock).toHaveBeenCalledWith({
      action: 'join',
      eventId: 'event-1',
      userId: 'user-1'
    })
  })

  it('loads upcoming events even when the publication status migration is not applied yet', async () => {
    const missingColumnError = new Error('column e.publication_status does not exist')
    ;(missingColumnError as any).code = '42703'
    ;(missingColumnError as any).column = 'publication_status'
    sqlMock
      .mockRejectedValueOnce(missingColumnError)
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          title: 'Apéro jacuzzi',
          event_date: new Date(Date.now() + 86_400_000).toISOString(),
          participant_count: '0',
          is_participating: false
        }
      ])

    const { getUpcomingEvents } = await import('@/actions/event-actions')

    const events = await getUpcomingEvents('user-1')

    expect(events).toHaveLength(1)
    expect(sqlMock).toHaveBeenCalledTimes(2)
    expect(sqlMock.mock.calls[1][0].join('')).not.toContain('publication_status')
  })

  it('loads published events for the connected member ordered by date and time', async () => {
    sqlMock.mockResolvedValueOnce([
      { id: 'event-1', event_date: '2026-07-10', event_time: '19:00:00' }
    ])

    const { getPublishedEventsForMember } = await import('@/actions/event-actions')

    const events = await getPublishedEventsForMember('user-1')
    const query = sqlMock.mock.calls[0][0].join('')

    expect(events).toHaveLength(1)
    expect(query).toContain("e.publication_status = 'published'")
    expect(query).toContain('ORDER BY e.event_date ASC, e.event_time ASC')
  })

  it('updates an event with separated event date and event time', async () => {
    sqlMock
      .mockResolvedValueOnce([{ creator_id: 'user-1' }])
      .mockResolvedValueOnce([{ id: 'event-1' }])

    const { updateEvent } = await import('@/actions/event-actions')

    const event = await updateEvent('event-1', {
      date: '2026-07-12T22:15'
    })
    const queryParts = sqlMock.mock.calls[1][0] as TemplateStringsArray
    const values = sqlMock.mock.calls[1].slice(1)

    expect(event).toEqual({ id: 'event-1' })
    expect(queryParts.join('')).toContain('event_time')
    expect(values).toEqual(
      expect.arrayContaining(['2026-07-12', '22:15:00'])
    )
  })

  it('derives the event creator role from the authenticated member or admin', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'member-event' }])
    const { createEvent } = await import('@/actions/event-actions')
    await createEvent({
      title: 'Apéro membre', location: 'Pigalle', date: '2027-07-10T21:30',
      creator_id: 'user-1', experience_type: 'jacuzzi', max_participants: 2,
      created_by_role: 'admin'
    })
    expect(sqlMock.mock.calls[0].slice(1)).toContain('member')

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'admin-1', role: 'admin' } })
    sqlMock.mockResolvedValueOnce([{ id: 'admin-event' }])
    await createEvent({
      title: 'Apéro admin', location: 'Pigalle', date: '2027-07-11T21:30',
      creator_id: 'admin-1', experience_type: 'jacuzzi', max_participants: 2,
      created_by_role: 'member'
    })
    expect(sqlMock.mock.calls[1].slice(1)).toContain('admin')
  })

  it('rejects participation when the event is full', async () => {
    sqlMock.mockResolvedValueOnce([
      {
        id: 'event-1',
        max_participants: 3,
        participant_count: '3',
        event_date: new Date(Date.now() + 86_400_000).toISOString(),
        publication_status: 'published'
      }
    ])

    const { subscribeToEvent } = await import('@/actions/event-actions')

    reserveEventSeatMock.mockResolvedValueOnce('full')
    const result = await subscribeToEvent('event-1', 'user-1')

    expect(result).toEqual({ success: false, error: 'Événement complet' })
    expect(reserveEventSeatMock).toHaveBeenCalledWith('event-1', 'user-1')
    expect(notifyEventReservationAdminsMock).not.toHaveBeenCalled()
  })

  it('rejects participation when the event is not published', async () => {
    sqlMock.mockResolvedValueOnce([
      {
        id: 'event-1',
        max_participants: 3,
        participant_count: '0',
        event_date: new Date(Date.now() + 86_400_000).toISOString(),
        publication_status: 'pending_review'
      }
    ])

    const { subscribeToEvent } = await import('@/actions/event-actions')

    const result = await subscribeToEvent('event-1', 'user-1')

    expect(result).toEqual({ success: false, error: 'Événement non publié' })
    expect(sqlMock).toHaveBeenCalledTimes(1)
  })

  it('loads event details with participant state using a parameterized query', async () => {
    sqlMock.query
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          title: 'Apéro jacuzzi',
          participant_count: '1',
          is_participating: true
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          name: 'Gilles',
          avatar: null,
          joined_at: new Date().toISOString()
        }
      ])

    const { getEventById } = await import('@/actions/event-actions')

    const event = await getEventById('event-1', 'user-1')

    expect(event?.participants).toHaveLength(1)
    expect(sqlMock.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('LEFT JOIN event_participants ep'),
      ['event-1', 'user-1']
    )
  })

  it('blocks resetting all events for non-admin users', async () => {
    const { resetAllEvents } = await import('@/actions/event-actions')

    await expect(resetAllEvents()).rejects.toThrow('administrateur')
    expect(sqlMock.query).not.toHaveBeenCalled()
  })

  it('lets an admin reset all events', async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: 'admin-1', role: 'admin' }
    })
    sqlMock.query.mockResolvedValueOnce([{ id: 'event-1' }, { id: 'event-2' }])

    const { resetAllEvents } = await import('@/actions/event-actions')

    const result = await resetAllEvents()

    expect(result).toEqual({ success: true, deletedCount: 2 })
    expect(sqlMock.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM events'),
      []
    )
  })
})
