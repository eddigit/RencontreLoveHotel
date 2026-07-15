import { describe, expect, it } from 'vitest'
import {
  EMPTY_EVENTS_STATE,
  getEventImage,
  sortEventsChronologically
} from '@/lib/event-presentation'

describe('events presentation helpers', () => {
  it('selects a branded default image from the event experience', () => {
    expect(
      getEventImage({ image: '', category: 'jacuzzi', experience_type: null })
    ).toBe('/images/events/apero-jacuzzi-rencontre.jpg')

    expect(
      getEventImage({
        image: null,
        category: null,
        experience_type: 'open_curtains'
      })
    ).toBe('/images/events/rideaux-ouverts-rencontre.jpg')

    expect(getEventImage({ image: null, category: 'community' })).toBe(
      '/paris-event-masquerade.png'
    )
  })

  it('keeps a custom event photo when one is provided', () => {
    expect(
      getEventImage({
        image: 'https://blob.example/event-photo.webp',
        category: 'jacuzzi',
        experience_type: 'jacuzzi'
      })
    ).toBe('https://blob.example/event-photo.webp')
  })

  it('sorts events chronologically by date and separated event time', () => {
    const sorted = sortEventsChronologically([
      { id: 'late', event_date: '2026-07-10', event_time: '21:30:00' },
      { id: 'tomorrow', event_date: '2026-07-11', event_time: '18:00:00' },
      { id: 'early', event_date: '2026-07-10', event_time: '19:00:00' }
    ])

    expect(sorted.map(event => event.id)).toEqual(['early', 'late', 'tomorrow'])
  })

  it('exposes a direct empty state for members', () => {
    expect(EMPTY_EVENTS_STATE.title).toBe('Aucun événement programmé pour le moment')
    expect(EMPTY_EVENTS_STATE.cta).toBe('Proposer un événement')
  })
})
