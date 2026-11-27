import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community home UI', () => {
  it('keeps discovery stateful with compact community shortcuts', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    expect(page).toContain("aria-label='Raccourcis de la communauté'")
    expect(page).toContain("href='/messages'")
    expect(page).toContain("href='/matches'")
    expect(page).toContain('Messages{counts.messages > 0')
    expect(page).not.toContain('primaryHomeAction')
    expect(page).toContain("id='new-profiles'")
    expect(page).toContain('AdvancedFilters value={filters} onFilterChange={handleFilterChange}')
    expect(page).toContain('writeDiscoverUrlState')
    expect(page).toContain('showAnotherBatch')
  })

  it('puts the wall first, shows only loaded agenda and presence data, and preserves feedback', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    expect(page).toContain("aria-labelledby='next-event-title'")
    expect(page).toContain("aria-label='Mur de la communauté'")
    expect(page).toContain('CommunityWall currentUserId={user.id}')
    expect(page).toContain("aria-label='Agenda et présence'")
    expect(page).toContain('upcomingEvents.map((event) =>')
    expect(page).toContain('onlineMembers.slice(0, 5).map((member) =>')
    expect(page).toContain('grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]')
    expect(page).toContain('overflow-x-hidden')
    expect(page).toContain('grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]')
    expect(page).not.toContain('aspect-[4/5]')
    expect(page).toContain("href='/events'")
    expect(page).toContain("href='/lieux'")
    expect(page).toContain("window.location.hash === '#boite-a-idees'")
    expect(page).toContain('setFeedbackOpen(true)')
    expect(page).toContain('aria-expanded={feedbackOpen}')
  })
})
