import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const notifyEventReservationAdminsMock = vi.hoisted(() => vi.fn())
const requestParticipationMock = vi.hoisted(() => vi.fn())
const withdrawParticipationMock = vi.hoisted(() => vi.fn())
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

vi.mock('@/lib/event-participation-service', () => ({
  requestParticipation: requestParticipationMock,
  withdrawParticipation: withdrawParticipationMock
}))

vi.mock('@/lib/member-activity-email', () => ({
  sendMemberActivityEmail: vi.fn().mockResolvedValue({ sent: false, reason: 'test' })
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
    requestParticipationMock.mockReset()
    withdrawParticipationMock.mockReset()
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

  it('keeps member-created events pending review even when the client asks for publication', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'event-member' }])

    const { createEvent } = await import('@/actions/event-actions')

    await createEvent({
      title: 'Proposition membre',
      location: 'Love Hotel Pigalle',
      date: '2026-07-10T21:30',
      creator_id: 'user-1',
      venue: 'pigalle',
      experience_type: 'jacuzzi',
      max_participants: 4,
      publication_status: 'published',
      created_by_role: 'admin'
    })

    const values = sqlMock.mock.calls[0].slice(1)
    expect(values).toContain('pending_review')
    expect(values).toContain('member')
  })

  it('stores the organizer as accepted and allows an unconfirmed room invitation', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'event-room' }])

    const { createEvent } = await import('@/actions/event-actions')

    await createEvent({
      title: 'Rideaux ouverts vendredi',
      location: 'Love Hotel Pigalle',
      date: '2026-07-18T22:00',
      creator_id: 'user-1',
      venue: 'pigalle',
      experience_type: 'open_curtains',
      max_participants: 3,
      booking_confirmed: false
    })

    const query = (sqlMock.mock.calls[0][0] as TemplateStringsArray).join('')
    const values = sqlMock.mock.calls[0].slice(1)
    expect(query).toContain('booking_confirmed')
    expect(query).toContain('inserted_organizer')
    expect(query).toContain("'accepted'")
    expect(values).toContain(false)
  })

  it('requires a booking reference only when Rideaux ouverts is confirmed', async () => {
    const { createEvent } = await import('@/actions/event-actions')

    await expect(createEvent({
      title: 'Rideaux ouverts confirmé',
      location: 'Love Hotel Châtelet',
      date: '2026-07-18T22:00',
      creator_id: 'user-1',
      venue: 'chatelet',
      experience_type: 'open_curtains',
      max_participants: 3,
      booking_confirmed: true,
      booking_reference: '   '
    })).rejects.toThrow('référence de réservation')

    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('publishes admin-created events and keeps the event clock in the upcoming query', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' }
    })
    sqlMock.mockResolvedValueOnce([{ id: 'event-admin' }])

    const { createEvent, getUpcomingEvents } = await import('@/actions/event-actions')

    await createEvent({
      title: 'Événement hôtel',
      location: 'Love Hotel Châtelet',
      date: '2026-07-10T21:30',
      creator_id: 'admin-1',
      venue: 'chatelet',
      experience_type: 'open_curtains',
      max_participants: 3,
      created_by_role: 'hotel'
    })

    const createValues = sqlMock.mock.calls[0].slice(1)
    expect(createValues).toContain('published')
    expect(createValues).toContain('hotel')

    sqlMock.mockReset()
    sqlMock.query.mockReset()
    sqlMock.mockResolvedValueOnce([])
    await getUpcomingEvents('admin-1')
    const upcomingQuery = sqlMock.mock.calls[0][0].join('')
    expect(upcomingQuery).toContain("COALESCE(e.event_time, '23:59:59'::time)")
    expect(upcomingQuery).toContain("ep2.status = 'accepted'")
    expect(upcomingQuery).toContain('ep.status as participation_status')
  })

  it('rejects standby event formats before writing to the database', async () => {
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
    ).rejects.toThrow('standby')

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
    requestParticipationMock.mockResolvedValueOnce({ success: true, status: 'pending' })

    const { subscribeToEvent } = await import('@/actions/event-actions')

    const result = await subscribeToEvent('event-1', 'user-1')

    expect(result).toEqual({ success: true, status: 'pending' })
    expect(requestParticipationMock).toHaveBeenCalledWith({ eventId: 'event-1', actorId: 'user-1' })
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

  it('blocks event reads when the session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null)
    const { getEventParticipants, getUpcomingEvents } = await import('@/actions/event-actions')

    await expect(getUpcomingEvents()).rejects.toThrow('Authentification requise')
    await expect(getEventParticipants('event-1')).rejects.toThrow('Authentification requise')
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('blocks participation lookup for another member', async () => {
    const { checkUserParticipation } = await import('@/actions/event-actions')

    await expect(
      checkUserParticipation('event-1', 'another-user')
    ).rejects.toThrow('propre compte')
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('rejects participation when the event is full', async () => {
    requestParticipationMock.mockResolvedValueOnce({ success: false, error: 'L’événement est complet.' })

    const { subscribeToEvent } = await import('@/actions/event-actions')

    const result = await subscribeToEvent('event-1', 'user-1')

    expect(result).toEqual({ success: false, error: 'L’événement est complet.' })
    expect(requestParticipationMock).toHaveBeenCalledOnce()
  })

  it('rejects participation when the event is not published', async () => {
    requestParticipationMock.mockResolvedValueOnce({ success: false, error: 'Cet événement n’est pas encore publié.' })

    const { subscribeToEvent } = await import('@/actions/event-actions')

    const result = await subscribeToEvent('event-1', 'user-1')

    expect(result).toEqual({ success: false, error: 'Cet événement n’est pas encore publié.' })
    expect(requestParticipationMock).toHaveBeenCalledOnce()
  })

  it('loads event details with participant state using a parameterized query', async () => {
    sqlMock.query
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          title: 'Apéro jacuzzi',
          participant_count: '1',
          is_participating: true,
          publication_status: 'published',
          creator_id: 'owner-1'
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
