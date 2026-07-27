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
      /ORDER BY\s+name_search_rank ASC,\s+has_personal_photo DESC,\s+u\.created_at DESC,\s+u\.id ASC\s+LIMIT[\s\S]*OFFSET/
    )
  })

  it('ranks member name matches before looser search matches', () => {
    const actions = readFileSync('actions/user-actions.ts', 'utf8')
    const directoryQuery = actions.slice(
      actions.indexOf('export async function searchCommunityMembers'),
      actions.indexOf('export async function getDiscoverProfiles')
    )

    expect(directoryQuery).toContain('AS name_search_rank')
    expect(directoryQuery).toContain('LOWER(COALESCE(u.name, \'\')) =')
    expect(directoryQuery).toContain('LOWER(COALESCE(u.name, \'\')) LIKE')
    expect(directoryQuery).toContain('LOWER(COALESCE(up.location, \'\')) LIKE')
  })
})
