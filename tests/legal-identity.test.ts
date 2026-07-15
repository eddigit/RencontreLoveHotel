import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('LHR legal identity', () => {
  const terms = readFileSync('app/terms/page.tsx', 'utf8')

  it('keeps legal responsibility with Love Hotel Paris and SARL L’HORA', () => {
    expect(terms).toContain('SARL L’HORA')
    expect(terms).toContain('88 rue Saint-Denis, 75001 Paris')
    expect(terms).toContain('https://lovehotelaparis.fr')
    expect(terms).toContain('lovehotelaparis@gmail.com')
    expect(terms).toContain('Directrice de la publication : Aïna M.')
    expect(terms).not.toContain('loolyyb@gmail.com')
  })
})
