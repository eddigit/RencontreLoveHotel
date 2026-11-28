import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member directory desire filters', () => {
  it('validates, preserves and displays the relationship and BDSM filters in the URL', () => {
    const page = readFileSync('app/members/page.tsx', 'utf8')

    expect(page).toContain('isDirectoryRelationshipIntent')
    expect(page).toContain('isDirectoryBdsmRole')
    expect(page).toContain("searchParams.get('relationshipIntent')")
    expect(page).toContain("searchParams.get('bdsmRole')")
    expect(page).toContain("params.set('relationshipIntent'")
    expect(page).toContain("params.set('bdsmRole'")
    expect(page).toContain("import { meetingCategories } from '@/lib/meeting-categories'")
    expect(page).toContain('{meetingCategories.map(({ value, label }) => {')
    expect(page).toContain("<DesireIcon value={filters.relationshipIntent && filters.relationshipIntent !== 'all' ? filters.relationshipIntent : 'classic'}")
    expect(page).toContain("<DesireIcon value={filters.bdsmRole && filters.bdsmRole !== 'all' ? filters.bdsmRole : 'bdsm'}")
  })

  it('applies each desire condition before counting and pagination', () => {
    const actions = readFileSync('actions/user-actions.ts', 'utf8')
    const directoryQuery = actions.slice(
      actions.indexOf('export async function searchCommunityMembers'),
      actions.indexOf('export async function getDiscoverProfiles')
    )

    expect(directoryQuery).toContain('up.relationship_intents')
    expect(directoryQuery).toContain('relationshipIntent === \'bdsm\'')
    expect(directoryQuery).toContain("(to_jsonb(up)->>'bdsm_roles_public')::boolean IS TRUE")
    expect(directoryQuery).toContain('genericBdsmRoles')
    expect(directoryQuery).toContain('OR (')
    expect(directoryQuery).toContain('AND COALESCE(up.bdsm_roles')
    expect(directoryQuery.indexOf("const whereCondition = `WHERE")).toBeGreaterThan(directoryQuery.indexOf('if (bdsmRole)'))
    expect(directoryQuery.indexOf('SELECT COUNT(DISTINCT u.id)')).toBeGreaterThan(directoryQuery.indexOf('const whereCondition'))
    expect(directoryQuery.indexOf('LIMIT ${limitPlaceholder}')).toBeGreaterThan(directoryQuery.indexOf('const whereCondition'))
  })
})
