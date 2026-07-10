import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('event moderation contract', () => {
  it('adds non-destructive moderation metadata to events', () => {
    const sql = readFileSync('migrations/20260711_event_moderation.sql', 'utf8')

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS moderation_note')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS moderated_by')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS moderated_at')
    expect(sql).toContain('idx_events_publication_created')
    expect(sql).toContain('events_rejected_note_check')
    expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM events/i)
  })

  it('keeps member event creation server-controlled', () => {
    const action = readFileSync('actions/event-actions.ts', 'utf8')

    expect(action).toContain("const publicationStatus = isAdminEvent ? 'published' : 'pending_review'")
    expect(action).toContain("const effectiveCreatedByRole")
    expect(action).toContain("created_by_role === 'hotel' ? 'hotel' : 'admin'")
  })
})
