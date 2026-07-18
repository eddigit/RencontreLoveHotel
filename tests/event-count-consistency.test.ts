import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('event count consistency', () => {
  it('uses the event date and time and counts only published upcoming events', () => {
    const stats = readFileSync('actions/admin-stats-actions.ts', 'utf8')
    const events = readFileSync('actions/event-actions.ts', 'utf8')

    expect(stats).toContain("event_date + COALESCE(event_time, '23:59:59'::time)")
    expect(stats).toContain("publication_status = 'published'")
    expect(events).toContain("event_date + COALESCE(e.event_time, '23:59:59'::time)")
    expect(events).toContain("e.publication_status = 'published'")
  })

  it('does not return a room booking reference in member catalogues', () => {
    const events = readFileSync('actions/event-actions.ts', 'utf8')
    const participation = readFileSync('lib/event-participation-service.ts', 'utf8')

    expect(events).toContain('hideBookingReference')
    expect(participation).toContain('booking_reference: _bookingReference')
  })
})
