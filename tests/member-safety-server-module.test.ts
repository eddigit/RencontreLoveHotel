import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member safety server module', () => {
  it('keeps static report options outside the use-server action module', () => {
    const actions = readFileSync('actions/member-safety-actions.ts', 'utf8')
    const types = readFileSync('lib/member-safety-types.ts', 'utf8')

    expect(actions).not.toContain('export const profileReportReasons')
    expect(types).toContain('export const profileReportReasons')
  })
})
