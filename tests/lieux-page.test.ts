import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('public places guide', () => {
  const page = readFileSync('app/lieux/venue-guide.tsx', 'utf8')

  it('lists the requested categories without fabricating availability', () => {
    expect(page).toContain("id: 'love-hotel'")
    expect(page).toContain("id: 'love-rooms-privees'")
    expect(page).toContain("id: 'restaurants'")
    expect(page).toContain("id: 'clubs'")
    expect(page).toContain("id: 'espaces-bdsm'")
    expect(page).toContain("id: 'theatre-erotique'")
    expect(page).toContain('Dates et billetterie à annoncer.')
    expect(page).toContain('Sélection de Love Rooms indépendantes en préparation.')
    expect(page).toContain('88 rue Saint-Denis, 75001 Paris')
    expect(page).toContain('72 boulevard de Clichy, 75018 Paris')
  })

  it('keeps a functional category selector and links established journeys', () => {
    expect(readFileSync('app/lieux/page.tsx', 'utf8')).toContain('await searchParams')
    expect(page).toContain('router.push(`/lieux?categorie=${categoryId}`')
    expect(page).toContain('href={`/lieux?categorie=${category.id}`}')
    expect(page).toContain("href: '/love-rooms'")
    expect(page).toContain("href: '/events'")
    expect(page).toContain("href='/discover#boite-a-idees'")
  })
})
