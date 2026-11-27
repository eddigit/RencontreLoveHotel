import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community home UI', () => {
  it('keeps discovery stateful with compact community shortcuts', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    const cards = readFileSync('components/circle-activity-cards.tsx', 'utf8')
    expect(page).toContain('betweenComposerAndFeed=')
    expect(cards).toContain("href: '/messages'")
    expect(cards).toContain("href: '/matches'")
    expect(cards).toContain('t.has_unread_messages')
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
    expect(page).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(17rem,30%)]')
    expect(page).toContain("<h2 className='mt-1 text-lg font-black'>Profils compatibles</h2>")
    expect(page).toContain('ResizeObserver(updateColumnCount)')
    expect(page).toContain('gridTemplateColumns: `repeat(${profileColumnCount}, minmax(0, 1fr))`')
    expect(page).toContain('DESKTOP_PROFILE_BATCH_SIZE = 18')
    expect(page).toContain('MIN_PROFILE_COLUMNS = 3')
    expect(page).toContain('<ProfileVisitors />')
    expect(page).not.toContain('aspect-[4/5]')
    expect(page).toContain("href='/events'")
    expect(page).toContain("href='/lieux'")
    expect(page).toContain("window.location.hash === '#boite-a-idees'")
    expect(page).toContain('setFeedbackOpen(true)')
    expect(page).toContain('aria-expanded={feedbackOpen}')
  })
})
