import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('production logging privacy', () => {
  it('does not serialize discovery profiles or SQL parameters', () => {
    const users = readFileSync('actions/user-actions.ts', 'utf8')
    const db = readFileSync('lib/db.ts', 'utf8')
    const logger = readFileSync('utils/logger.ts', 'utf8')

    expect(users).not.toContain('Returning final result object')
    expect(users).not.toContain('JSON.stringify(result')
    expect(users).not.toContain('Final baseParams')
    expect(users).not.toContain('Existing match:')
    expect(users).not.toContain('Insert/Update result:')
    expect(db).not.toContain('params: params')
    expect(logger).toContain('sanitizeMeta')
    expect(logger).not.toContain("'\n' + JSON.stringify(meta")
  })
})
