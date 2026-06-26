import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Love Hotel experience migration', () => {
const migration = fs.readFileSync(
  path.join(process.cwd(), 'migrations/20260611_add_love_hotel_experience_fields.sql'),
  'utf8'
)
const eventTimeMigration = fs.readFileSync(
  path.join(process.cwd(), 'migrations/20260626_add_events_event_time.sql'),
  'utf8'
)

  it('adds beta experience fields to events', () => {
    expect(migration).toContain('ALTER TABLE events')
    expect(migration).toContain('venue')
    expect(migration).toContain('experience_type')
    expect(migration).toContain('max_participants')
    expect(migration).toContain('publication_status')
    expect(migration).toContain('created_by_role')
  })

  it('defaults beta-created events to published', () => {
    expect(migration).toContain("DEFAULT 'published'")
    expect(migration).toContain("CHECK (publication_status IN ('published', 'pending_review', 'rejected'))")
  })

  it('keeps the production events schema compatible with event creation', () => {
    expect(eventTimeMigration).toContain('ADD COLUMN IF NOT EXISTS event_time')
    expect(eventTimeMigration).toContain("DEFAULT '20:00:00'")
  })
})
