import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('event participation request migration', () => {
  it('versions booking and organizer-approved participation states without losing history', () => {
    const migrationPath = 'migrations/20260713_event_participation_requests.sql'
    expect(existsSync(migrationPath)).toBe(true)
    if (!existsSync(migrationPath)) return

    const migration = readFileSync(migrationPath, 'utf8')
    const schema = readFileSync('schema.sql', 'utf8')

    expect(migration).toContain('booking_confirmed BOOLEAN NOT NULL DEFAULT FALSE')
    expect(migration).toContain('booking_reference TEXT')
    expect(migration).toContain("status TEXT NOT NULL DEFAULT 'accepted'")
    expect(migration).toContain("status IN ('pending', 'accepted', 'rejected', 'withdrawn')")
    expect(migration).toContain('events_open_curtains_booking_check')
    expect(migration).toContain('event_participants_status_check')
    expect(migration).toContain('idx_event_participants_event_status')
    expect(migration).toContain('idx_event_participants_user_status')

    expect(schema).toContain('booking_confirmed BOOLEAN NOT NULL DEFAULT FALSE')
    expect(schema).toContain('booking_reference TEXT')
    expect(schema).toContain("status TEXT NOT NULL DEFAULT 'accepted'")
  })
})
