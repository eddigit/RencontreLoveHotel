import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile id routing', () => {
  it('does not reject non-UUID persisted member ids before loading the profile', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')

    expect(page).not.toContain('uuidRegex')
    expect(page).toContain('normalizeProfileRouteId')
    expect(page).toContain('profileId.length > 128')
    expect(page).toContain('getUserProfile(profileId)')
  })
})
