import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('admin user star migration', () => {
  it('adds an idempotent nullable timestamp for a reversible admin-only marker', () => {
    const migration = readFileSync('migrations/20261127_add_admin_user_star.sql', 'utf8')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS admin_starred_at TIMESTAMPTZ')
    expect(migration).toContain('NULL means the member is not currently starred')
  })
})
