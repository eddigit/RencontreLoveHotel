import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

describe('LHR V2 shell', () => {
  it('exposes the core dating product navigation', () => {
    const shell = readFileSync(join(root, 'components/lhr-v2-shell.tsx'), 'utf8')

    expect(shell).toContain("href: '/discover'")
    expect(shell).toContain("href: '/messages'")
    expect(shell).toContain("href: '/matches'")
    expect(shell).toContain("href: '/events'")
    expect(shell).toContain("href: '/profile'")
  })

  it('removes the legacy header from V2 member screens', () => {
    const header = readFileSync(join(root, 'components/header.tsx'), 'utf8')

    expect(header).toContain("pathname === '/discover'")
    expect(header).toContain("pathname === '/messages'")
    expect(header).toContain("pathname.startsWith('/messages/')")
    expect(header).toContain("pathname.startsWith('/profile/')")
  })
})
