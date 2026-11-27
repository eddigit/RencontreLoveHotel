import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member directory photo priority', () => {
  it('orders moderator spotlights, existing admin favorites, real photos, then no-photo profiles before pagination', () => {
    const actions = readFileSync('actions/user-actions.ts', 'utf8')
    const directoryQuery = actions.slice(
      actions.indexOf('export async function searchCommunityMembers'),
      actions.indexOf('export async function getDiscoverProfiles')
    )

    expect(directoryQuery).toContain('AS has_personal_photo')
    expect(directoryQuery).toContain('AS photo_rank')
    expect(directoryQuery).toContain('u.moderator_spotlight_at IS NOT NULL THEN 3')
    expect(directoryQuery).toContain('u.admin_starred_at IS NOT NULL THEN 2')
    expect(directoryQuery).toMatch(
      /ORDER BY\s+name_search_rank ASC,\s+photo_rank DESC,\s+u\.created_at DESC,\s+u\.id ASC\s+LIMIT[\s\S]*OFFSET/
    )
  })

  it('keeps member pagination deterministic with an immutable final tie-breaker', () => {
    const actions = readFileSync('actions/user-actions.ts', 'utf8')
    const directoryQuery = actions.slice(
      actions.indexOf('export async function searchCommunityMembers'),
      actions.indexOf('export async function getDiscoverProfiles')
    )

    expect(directoryQuery).toContain('u.created_at DESC, u.id ASC')
    expect(directoryQuery).toContain('LIMIT ${limitPlaceholder}')
    expect(directoryQuery).toContain('OFFSET ${offsetPlaceholder}')
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
