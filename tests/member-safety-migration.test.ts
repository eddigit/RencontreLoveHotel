import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member safety migration', () => {
  const migration = readFileSync('migrations/20260712_member_safety_controls.sql', 'utf8')

  it('creates personal blocks with reciprocal lookup indexes and no self blocking', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS user_blocks')
    expect(migration).toContain('CHECK (blocker_id <> blocked_id)')
    expect(migration).toContain('UNIQUE (blocker_id, blocked_id)')
    expect(migration).toContain('idx_user_blocks_blocked')
  })

  it('creates profile reports without automatic account sanctions', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS profile_reports')
    expect(migration).toContain('reported_user_id')
    expect(migration).toContain("status IN ('new', 'in_review', 'dismissed', 'actioned')")
    expect(migration).not.toContain("UPDATE users SET status = 'banned'")
  })
})
