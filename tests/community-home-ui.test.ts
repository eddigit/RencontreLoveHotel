import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community home UI', () => {
  it('turns discover into a community landing page', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

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
    expect(page).toContain('derniers profils visibles')
    expect(page).toContain('en 24 h')
  })

  it('prioritizes Love Hotel experiences and keeps premium as a teaser', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    expect(page).toContain("2xl:grid-cols-[260px_minmax(0,1fr)_360px]")
    expect(page).toContain("order-2 xl:order-3")
    expect(page.indexOf('RIDEAUX OUVERTS')).toBeLessThan(page.indexOf('Apéro jacuzzi rencontre'))
    expect(page.indexOf('Apéro jacuzzi rencontre')).toBeLessThan(page.indexOf('En ligne dans la communauté'))
    expect(page.indexOf('En ligne dans la communauté')).toBeLessThan(page.indexOf('Club Love Hotel'))
    expect(page.indexOf('Club Love Hotel')).toBeLessThan(page.indexOf('Suggestions compatibles'))
    expect(page).toContain('messages illimités')
    expect(page).toContain('photos, vidéos et vocaux')
    expect(page).toContain('lives privés')
    expect(page).toContain('Être prévenu')
    expect(page).not.toContain('€')
  })
})
