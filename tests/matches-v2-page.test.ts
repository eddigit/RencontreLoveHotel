import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('matches V2 page', () => {
  it('uses the shared V2 member shell', () => {
    const page = readFileSync(join(root, 'app/matches/page.tsx'), 'utf8')
    const header = readFileSync(join(root, 'components/header.tsx'), 'utf8')

    expect(page).toContain('LhrV2Shell')
    expect(header).toContain("pathname === '/matches'")
  })

  it('makes incoming and outgoing pending requests explicit', () => {
    const page = readFileSync(join(root, 'app/matches/page.tsx'), 'utf8')

    expect(page).toContain('Demandes reçues')
    expect(page).toContain('Demandes envoyées')
    expect(page).toContain('Matchs actifs')
  })

  it('guards match acceptance against duplicate submits and bad API payloads', () => {
    const page = readFileSync(join(root, 'app/matches/page.tsx'), 'utf8')

    expect(page).toContain('acceptingId')
    expect(page).toContain('if (acceptingId) return')
    expect(page).toContain('response.headers.get')
    expect(page).toContain('disabled={acceptingId === profile.id}')
    expect(page).toContain('Acceptation...')
  })
})
