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

  it('recovers when a deployment invalidates the page server actions', () => {
    const page = readFileSync(join(root, 'app/matches/page.tsx'), 'utf8')

    expect(page).toContain("import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'")
    expect(page).toContain('if (recoverFromStaleServerAction(err)) return')
  })
})
