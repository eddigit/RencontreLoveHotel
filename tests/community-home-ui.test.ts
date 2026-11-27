import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community home UI', () => {
  it('prioritizes one real next action and keeps discovery stateful', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    expect(page).toContain('const primaryHomeAction = counts.messages > 0')
    expect(page).toContain("href: '/messages'")
    expect(page).toContain("href: '/matches'")
    expect(page).toContain("href: '/members'")
    expect(page).toContain("aria-label='Action principale'")
    expect(page).toContain('counts.matches > 0 || counts.events > 0')
    expect(page).toContain("id='new-profiles'")
    expect(page).toContain('AdvancedFilters value={filters} onFilterChange={handleFilterChange}')
    expect(page).toContain('writeDiscoverUrlState')
    expect(page).toContain('showAnotherBatch')
  })

  it('centers the actual agenda and preserves the historical feedback link', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    expect(page).toContain("aria-labelledby='next-event-title'")
    expect(page).toContain('Mon cercle · prochain rendez-vous')
    expect(page).toContain("href='/events'")
    expect(page).toContain("href='/lieux'")
    expect(page).toContain("window.location.hash === '#boite-a-idees'")
    expect(page).toContain('setFeedbackOpen(true)')
    expect(page).toContain('aria-expanded={feedbackOpen}')
  })
})
