import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('Joug legal identity', () => {
  const terms = readFileSync('app/terms/page.tsx', 'utf8')
  const notice = readFileSync('app/mentions-legales/page.tsx', 'utf8')

  it('publishes the legal notice approved on 28 November 2026', () => {
    expect(notice).toContain('Joug Limited')
    expect(notice).toContain('En cours d’immatriculation au Companies Registration Office (CRO), Dublin')
    expect(notice).toContain('Oscar CARRERE')
    expect(notice).toContain("const CONTACT = 'jougworld@gmail.com'")
    expect(notice).toContain('Dernière mise à jour : 28 novembre 2026')
  })

  it('keeps a single place for the publisher, reachable without an account', () => {
    expect(terms).toContain("href='/mentions-legales'")
    expect(terms).not.toContain('Directrice de la publication')
    expect(terms).not.toContain('loolyyb@gmail.com')
    expect(readFileSync('lib/route-access.ts', 'utf8')).toContain("'/mentions-legales'")
    expect(readFileSync('components/footer.tsx', 'utf8')).toContain("href='/mentions-legales'")
  })
})
