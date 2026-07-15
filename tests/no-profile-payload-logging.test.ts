import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const actionsSource = readFileSync(join(process.cwd(), 'actions/user-actions.ts'), 'utf8')

describe('profile logging policy', () => {
  it('does not write full discover profile payloads to production logs', () => {
    expect(actionsSource).not.toContain('JSON.stringify(result, null, 2)')
    expect(actionsSource).not.toContain('Returning final result object')
  })
})
