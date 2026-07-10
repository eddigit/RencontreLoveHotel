import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community home UI', () => {
  it('turns discover into a community landing page', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')
    const userActions = readFileSync('actions/user-actions.ts', 'utf8')

    expect(page).toContain('Communauté')
    expect(page).toContain('En ligne maintenant')
    expect(page).toContain('Nouveaux membres')
    expect(page).toContain('Vos matchs')
    expect(page).toContain('Événements à venir')
    expect(page).toContain('Love Rooms')
    expect(page).toContain('getUpcomingEvents')
    expect(page).toContain('getUserMatches')
    expect(page).toContain('getCommunityMemberStats')
    expect(page).toContain('adhérents')
    expect(userActions).toContain('u.onboarding_completed = TRUE')
    expect(page).toContain('derniers profils visibles')
    expect(page).toContain('en 24 h')
    expect(page).toContain('created_at?: string | Date | null')
    expect(page).toContain('const newProfiles = [...filteredProfiles]')
    expect(page).toContain('.sort((left, right) =>')
    expect(page.indexOf("id='new-profiles'")).toBeLessThan(page.indexOf('<CommunityWall currentUserId={user.id}'))
    const eventsSectionIndex = page.indexOf("<h2 className='text-xl font-black'>Événements à venir</h2>")
    expect(page.indexOf('<CommunityWall currentUserId={user.id}')).toBeLessThan(eventsSectionIndex)
    expect(eventsSectionIndex).toBeLessThan(page.indexOf("id='online-now'"))
    expect(page.match(/En ligne dans la communauté/g) || []).toHaveLength(0)
  })

  it('prioritizes Love Hotel experiences and keeps premium as a teaser', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    expect(page).toContain("2xl:grid-cols-[260px_minmax(0,1fr)_360px]")
    expect(page).toContain("order-2 xl:order-3")
    expect(page.indexOf('RIDEAUX OUVERTS')).toBeLessThan(page.indexOf('Apéro jacuzzi rencontre'))
    expect(page.indexOf('Événements à venir')).toBeLessThan(page.indexOf('Club Love Hotel'))
    expect(page.indexOf('Club Love Hotel')).toBeLessThan(page.indexOf('Suggestions compatibles'))
    expect(page).toContain('messages illimités')
    expect(page).toContain('photos, vidéos et vocaux')
    expect(page).toContain('lives privés')
    expect(page).toContain('Être prévenu')
    expect(page).not.toContain('€')
  })
})
