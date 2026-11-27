import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Discover authenticated shell', () => {
  it('limits the light member shell to the authenticated Discover route', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const styles = readFileSync('components/site-shell.module.css', 'utf8')

    expect(shell).toContain("const isDiscoverShell = Boolean(user && pathname === '/discover')")
    expect(shell).toContain('isDiscoverShell && styles.discoverShell')
    expect(shell).toContain('isDiscoverShell && styles.rail')
    expect(shell).toContain('isDiscoverShell && styles.panel')
    expect(shell).toContain("data-chat-thread={/^\\/messages\\/[^/]+\\/?$/.test(pathname) || undefined}")
    expect(styles).toContain('--discover-ivory: #f7f4ec')
    expect(styles).toContain('--discover-navy: #102440')
    expect(styles).toContain('--discover-cobalt: #2563eb')
  })

  it('presents discoverable members as a two-card mobile photo strip', () => {
    const portraits = readFileSync('components/community-portraits.tsx', 'utf8')
    const styles = readFileSync('components/site-shell.module.css', 'utf8')

    expect(portraits).toContain('À découvrir')
    expect(portraits).toContain('styles.communityStrip')
    expect(portraits).toContain('styles.onlineDot')
    expect(styles).toContain('flex: 0 0 calc((100% - 0.75rem) / 2)')
    expect(styles).toContain('background: #16a34a')
    expect(styles).not.toContain('#ffc4df')
    expect(styles).not.toContain('pink')
  })
})
