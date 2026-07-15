import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('migrations/20260715_product_growth_cockpit.sql', 'utf8')

describe('product growth cockpit migration', () => {
  it('creates the aggregate instrumentation and safety tables', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS product_events')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS diagnostic_snapshots')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS user_blocks')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS user_reports')
  })

  it('extends match lifecycle and indexes discovery events', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS expires_at')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS responded_at')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS context')
    expect(migration).toContain('idx_product_events_name_created')
    expect(migration).toContain('idx_product_events_subject_name_created')
  })
})
