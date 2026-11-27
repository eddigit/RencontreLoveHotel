import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('atomic event capacity reservation', () => {
  it('serializes the capacity check and insert for each event', () => {
    const source = readFileSync('lib/event-participation.ts', 'utf8')
    expect(source).toContain('withTransaction')
    expect(source).toContain('FOR UPDATE')
    expect(source).toContain('SELECT COUNT(*)::text AS count')
    expect(source).toContain('ON CONFLICT (event_id, user_id) DO NOTHING')
  })

  it('is shared by the action and API entries', () => {
    expect(readFileSync('actions/event-actions.ts', 'utf8')).toContain('reserveEventSeat(eventId, userId)')
    expect(readFileSync('app/api/events/[id]/participate/route.ts', 'utf8')).toContain('reserveEventSeat(eventId, userId)')
  })
})
