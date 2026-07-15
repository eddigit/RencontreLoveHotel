import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('booked room invitations migration', () => {
  it('requires a confirmed room before invitations and stores participation decisions', () => {
    const migration = readFileSync('migrations/20260711_booked_room_invitations.sql', 'utf8')

    for (const field of [
      'venue',
      'room_name',
      'starts_at',
      'guest_capacity',
      'booking_confirmed',
      'booking_reference'
    ]) {
      expect(migration).toContain(field)
    }
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS wall_participation_requests')
    expect(migration).toContain("'pending', 'accepted', 'rejected', 'withdrawn'")
    expect(migration).toContain('UNIQUE (post_id, user_id)')
    expect(migration).toContain('booking_confirmed = FALSE')
    expect(migration).toContain('booking_reference')
  })
})
