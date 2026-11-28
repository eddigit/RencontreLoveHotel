import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('visitor landing redesign', () => {
  it('renders the home route with a visitor header and without the application sidebar', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const headerPath = 'components/visitor-landing-header.tsx'
    const header = existsSync(headerPath) ? readFileSync(headerPath, 'utf8') : ''

    expect(existsSync(headerPath)).toBe(true)
    expect(shell).toContain("pathname === '/'")
    expect(shell).toContain('<VisitorLandingHeader')
    expect(shell.indexOf("pathname === '/'")).toBeLessThan(shell.indexOf("<aside "))
    expect(header).toContain("href='/concept'")
    expect(header).toContain("href='https://lovehotelaparis.fr'")
    expect(header).toContain("href='/events'")
    expect(header).toContain("href='/rencontres'")
    expect(header).toContain("href='/login'")
    expect(header).toContain("href='/register'")
    expect(header).toContain("aria-label='Connexion'")
    expect(header).toContain('Inscription')
  })

  it('presents real Love Hotel journeys and clearly marks future places as in development', () => {
    const landing = readFileSync('app/landing-page.tsx', 'utf8')
    const normalizedLanding = landing.toLowerCase()

    expect(landing).toContain("id='concept'")
    expect(landing).toContain("id='hotels'")
    expect(landing).toContain("id='experiences'")
    expect(landing).toContain("id='communaute'")
    expect(landing).toContain('Love Hôtel Pigalle')
    expect(landing).toContain('Love Hôtel Châtelet')
    expect(landing).toContain('Une communauté qui se rencontre vraiment')
    expect(landing).toContain('Apéros jacuzzi')
    expect(landing).toContain('RIDEAUX OUVERTS')
    expect(landing).toContain('/apero-jacuzzi-rencontre.jpg')
    expect(landing).toContain('/paris-event-limousine.png')
    expect(landing).toContain('/soiree-masquee.webp')
    expect(landing).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(landing).not.toContain('/events-offers.avif')
    expect(landing).toContain("href='/lieux'")
    expect(landing).toContain('/lieux?categorie=love-hotel')
    expect(landing).toContain('/lieux?categorie=love-rooms-privees')
    expect(landing).toContain('/lieux?categorie=restaurants')
    expect(landing).toContain('/lieux?categorie=clubs')
    expect(landing).toContain('/lieux?categorie=espaces-bdsm')
    expect(landing).toContain('/lieux?categorie=theatre-erotique')
    expect(landing).toContain('50 nuances de rouge')
    expect(normalizedLanding).not.toContain('brasserie')
    expect(landing).not.toContain('LOOLYYB')
    expect(landing).not.toContain('AdvertisementBannerBottom')
    expect(landing).toContain('priority')
    expect(landing).not.toContain("purple-glow-pattern")
  })
})
