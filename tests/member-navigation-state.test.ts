import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('member navigation state', () => {
  it('keeps member directory filters and page in the URL for back navigation', () => {
    const page = readFileSync(join(root, 'app/members/page.tsx'), 'utf8')

    expect(page).toContain('useSearchParams')
    expect(page).toContain('filtersFromSearchParams')
    expect(page).toContain('writeMemberDirectoryUrlState')
    expect(page).toContain("params.set('search'")
    expect(page).toContain("params.set('profileType'")
    expect(page).toContain("params.set('orientation'")
    expect(page).toContain("params.set('meetingCriterion'")
    expect(page).toContain("params.set('onlineOnly'")
    expect(page).toContain("params.set('page'")
  })

  it('keeps discovery filters, search and profile batch in the URL', () => {
    const page = readFileSync(join(root, 'app/discover/page.tsx'), 'utf8')

    expect(page).toContain('useSearchParams')
    expect(page).toContain('discoverFiltersFromSearchParams')
    expect(page).toContain('writeDiscoverUrlState')
    expect(page).toContain("params.set('q'")
    expect(page).toContain("params.set('batch'")
    expect(page).toContain("params.set('onlineOnly'")
    expect(page).toContain("params.set('meetingTypes'")
  })

  it('keeps the active matches tab in the URL', () => {
    const page = readFileSync(join(root, 'app/matches/page.tsx'), 'utf8')

    expect(page).toContain('useSearchParams')
    expect(page).toContain('tabFromSearchParams')
    expect(page).toContain('writeMatchesUrlState')
    expect(page).toContain("params.set('tab', tab)")
  })
})
