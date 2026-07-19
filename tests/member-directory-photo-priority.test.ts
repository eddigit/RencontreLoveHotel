import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member directory photo priority', () => {
  it('orders personal avatar profiles before native-avatar profiles before pagination', () => {
    const actions = readFileSync('actions/user-actions.ts', 'utf8')
    const directoryQuery = actions.slice(
      actions.indexOf('export async function searchCommunityMembers'),
      actions.indexOf('export async function getDiscoverProfiles')
    )

    expect(directoryQuery).toContain('AS has_personal_photo')
    expect(directoryQuery).toMatch(
      /ORDER BY\s+has_personal_photo DESC,\s+u\.created_at DESC\s+LIMIT[\s\S]*OFFSET/
    )
  })
})
