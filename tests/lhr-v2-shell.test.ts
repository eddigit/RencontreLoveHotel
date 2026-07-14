import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

describe('LHR V2 shell', () => {
  it('exposes the core dating product navigation', () => {
    const shell = readFileSync(join(root, 'components/site-shell.tsx'), 'utf8')

    expect(shell).toContain("href: '/discover'")
    expect(shell).toContain("href: '/messages'")
    expect(shell).toContain("href: '/matches'")
    expect(shell).toContain("href: '/events'")
    expect(shell).toContain("href: '/profile'")
  })

  it('removes the legacy header from V2 member screens', () => {
    const layout = readFileSync(join(root, 'components/layout/main-layout.tsx'), 'utf8')

    expect(layout).toContain("pathname.startsWith('/admin')")
    expect(layout).toContain('return <>{children}</>')
  })
})
