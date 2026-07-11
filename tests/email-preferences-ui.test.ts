import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('campaign email preferences', () => {
  it('lets a signed-in member stop or resume campaign emails', () => {
    const action = readFileSync('actions/email-preference-actions.ts', 'utf8')
    const page = readFileSync('app/email-preferences/page.tsx', 'utf8')

    expect(action).toContain('requireCurrentUser()')
    expect(action).toContain('campaign_opt_in')
    expect(action).toContain('opted_out_at')
    expect(page).toContain('Ne plus recevoir ces emails')
    expect(page).toContain('Recevoir les actualités')
  })
})
