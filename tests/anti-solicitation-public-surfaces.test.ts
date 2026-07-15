import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : ''

describe('anti-solicitation public commitment', () => {
  it('shows the prohibition before registration and login', () => {
    const surfaces = [
      read('app/landing-page.tsx'),
      read('app/login/page.tsx'),
      read('app/register/page.tsx')
    ].join('\n')

    expect(surfaces).toContain('Aucune prestation sexuelle rémunérée')
    expect(surfaces).toContain('/community-safety')
    expect(surfaces).toContain('adhérents-modérateurs')
  })

  it('publishes a detailed charter and distinguishes official LHR prices', () => {
    const charter = read('app/community-safety/page.tsx')
    const terms = read('app/terms/page.tsx')

    expect(charter).toContain('Charte de sécurité communautaire')
    expect(charter).toContain('argent, cadeau, hébergement, transport, service ou avantage')
    expect(charter).toContain('tarifs officiels des événements, Love Rooms et services de conciergerie')
    expect(charter).toContain('réexamen humain')
    expect(charter).toContain('validation juridique')
    expect(terms).toContain('sollicitation sexuelle rémunérée')
  })

  it('keeps the charter publicly accessible', () => {
    expect(read('lib/route-access.ts')).toContain("'/community-safety'")
    expect(read('lib/route-access.ts')).toContain("'/privacy'")
    expect(read('app/privacy/page.tsx')).toContain('Détection anti-sollicitation')
  })
})
