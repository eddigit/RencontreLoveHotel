import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('events partner offer and community rules', () => {
  it('states the current Love Hotel offer and keeps future partners clearly prospective', () => {
    const events = readFileSync('app/events/page.tsx', 'utf8')

    expect(events).toContain('Offre partenaire actuelle')
    expect(events).toContain('Love Room, jacuzzi privatif et rideaux ouverts')
    expect(events).toContain("href='/love-rooms?tab=reserve'")
    expect(events).toContain('une date organisée par Joug')
    expect(events).toContain('Objectif janvier 2027')
    expect(events).toContain('restaurants, clubs, théâtres et lieux privés')
    expect(events).toContain('à mesure de leur confirmation')
  })

  it('keeps membership open, referral optional, and paid solicitation subject to verified immediate ban', () => {
    const register = readFileSync('app/register/page.tsx', 'utf8')
    const charter = readFileSync('app/community-safety/page.tsx', 'utf8')

    expect(register).toContain('Le parrainage est facultatif et recommandé, jamais obligatoire.')
    expect(charter).toContain('Inscription libre, parrainage recommandé')
    expect(charter).toContain('Le parrainage est facultatif et recommandé')
    expect(charter).toContain('Toute tentative ou demande de sollicitation sexuelle tarifée est interdite.')
    expect(charter).toContain('le compte concerné est banni immédiatement')
    expect(charter).toContain('vérification humaine')
  })

  it('exposes the rules icon in the connected desktop and mobile shell', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')

    expect(shell).toContain("href: '/community-safety', label: 'Règles', icon: ShieldCheck")
    expect(shell).toContain("aria-label='Ouvrir les règles de la communauté'")
    expect(shell).toContain('<ShieldCheck className=\'size-5\' aria-hidden />')
    expect(shell).toContain("<ShieldCheck className='h-5 w-5' aria-hidden />")
  })

  it('opens the Love Hotel booking tab from the reservation link', () => {
    const rooms = readFileSync('app/love-rooms/page.tsx', 'utf8')

    expect(rooms).toContain("useSearchParams()")
    expect(rooms).toContain("searchParams.get('tab') === 'reserve' ? 'reserve' : 'offers'")
    expect(rooms).toContain('<LoveHotelBookingWidget />')
  })
})
