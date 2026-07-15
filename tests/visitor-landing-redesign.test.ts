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
    expect(shell.indexOf("pathname === '/'")).toBeLessThan(shell.indexOf("<aside className='sticky"))
    expect(header).toContain("href='#concept'")
    expect(header).toContain("href='#hotels'")
    expect(header).toContain("href='#experiences'")
    expect(header).toContain("href='#communaute'")
    expect(header).toContain("href='/login'")
    expect(header).toContain("href='/register'")
  })

  it('presents the two hotels and community-created experiences', () => {
    const landing = readFileSync('app/landing-page.tsx', 'utf8')
    const normalizedLanding = landing.toLowerCase()

    expect(landing).toContain("id='concept'")
    expect(landing).toContain("id='hotels'")
    expect(landing).toContain("id='experiences'")
    expect(landing).toContain("id='communaute'")
    expect(landing).toContain('Love Hôtel Pigalle')
    expect(landing).toContain('Love Hôtel Châtelet')
    expect(landing).toContain('Créez vos propres événements')
    expect(landing).toContain('Apéros jacuzzi')
    expect(landing).toContain('RIDEAUX OUVERTS')
    expect(landing).toContain('/apero-jacuzzi-rencontre.jpg')
    expect(landing).toContain('/paris-event-limousine.png')
    expect(landing).toContain('/paris-event-masquerade.png')
    expect(landing).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(landing).not.toContain('/events-offers.avif')
    expect(normalizedLanding).not.toContain('restaurant')
    expect(normalizedLanding).not.toContain('bars')
    expect(landing).not.toContain('LOOLYYB')
    expect(landing).not.toContain('AdvertisementBannerBottom')
  })
})
