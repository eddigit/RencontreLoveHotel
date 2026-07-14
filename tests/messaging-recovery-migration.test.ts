import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('messaging recovery match timestamps', () => {
  it('adds and backfills the accepted match timestamp', () => {
    const migration = readFileSync(
      'migrations/20260714_add_user_matches_accepted_at.sql',
      'utf8'
    )

    expect(migration).toContain(
      'ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ'
    )
    expect(migration).toContain(
      'SET accepted_at = COALESCE(accepted_at, updated_at, created_at)'
    )
    expect(migration).toContain("WHERE status = 'accepted'")
  })

  it('keeps accepted_at in the canonical schema', () => {
    const schema = readFileSync('schema.sql', 'utf8')

    expect(schema).toMatch(/accepted_at\s+TIMESTAMPTZ/)
  })

  it('records acceptance and clears stale acceptance dates on later states', () => {
    const userActions = readFileSync('actions/user-actions.ts', 'utf8')
    const legacyActions = readFileSync('app/actions.ts', 'utf8')

    expect(userActions).toMatch(
      /SET status = 'accepted',\s*accepted_at = CURRENT_TIMESTAMP/
    )
    expect(legacyActions).toMatch(
      /SET status = 'accepted',\s*accepted_at = CURRENT_TIMESTAMP/
    )
    expect(userActions).toMatch(
      /DO UPDATE SET status = 'pending',\s*accepted_at = NULL/
    )
    expect(userActions).toMatch(
      /SET status = 'rejected',\s*accepted_at = NULL/
    )
    expect(legacyActions).toMatch(
      /SET status = 'rejected',\s*accepted_at = NULL/
    )
  })
})
