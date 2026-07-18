import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('simple event workflow', () => {
  const listPage = readFileSync('app/events/page.tsx', 'utf8')
  const createPage = readFileSync('app/events/new.tsx', 'utf8')

  it('uses three obvious member views and keeps the external agenda secondary', () => {
    expect(listPage).toContain("type View = 'upcoming' | 'owned' | 'participating'")
    expect(listPage).toContain('À venir')
    expect(listPage).toContain('Mes événements')
    expect(listPage).toContain('Mes participations')
    expect(listPage).toContain('Voir l’agenda Rideaux ouverts')
    expect(listPage).not.toContain('<iframe')
  })

  it('waits for authentication before redirecting a connected member', () => {
    expect(listPage).toContain('const { user, isLoading } = useAuth()')
    expect(listPage).toContain('if (isLoading) return')
    expect(listPage.indexOf('if (isLoading) return')).toBeLessThan(
      listPage.indexOf("router.replace('/login')")
    )
  })

  it('keeps only the community essentials in member creation', () => {
    expect(createPage).toContain('Apéro jacuzzi')
    expect(createPage).toContain('Rideaux ouverts')
    expect(createPage).toContain('/apero-jacuzzi-rencontre.jpg')
    expect(createPage).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(createPage).not.toContain('prix_personne_seule')
    expect(createPage).not.toContain('payment_mode')
  })
})
