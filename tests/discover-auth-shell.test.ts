import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Discover authenticated shell', () => {
  it('uses the dark circle shell on member routes', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const styles = readFileSync('components/site-shell.module.css', 'utf8')

    expect(shell).toContain("const isMemberShell = Boolean(user)")
    expect(shell).toContain('isMemberShell && styles.discoverShell')
    expect(shell).toContain('isMemberShell && styles.rail')
    expect(shell).toContain('isMemberShell && styles.panel')
    expect(shell).toContain("data-chat-thread={/^\\/messages\\/[^/]+\\/?$/.test(pathname) || undefined}")
    expect(styles).toContain('--discover-canvas: #04070b')
    expect(styles).toContain('--discover-charcoal: #04070b')
    expect(styles).toContain('--discover-accent: #ecebe7')
  })

  it('presents discoverable members in a compact scrollable portrait strip', () => {
    const portraits = readFileSync('components/community-portraits.tsx', 'utf8')
    const styles = readFileSync('components/site-shell.module.css', 'utf8')

    expect(portraits).toContain('À découvrir')
    expect(portraits).toContain('styles.communityStrip')
    expect(portraits).toContain('styles.onlineDot')
    expect(styles).toContain('flex: 0 0 4.75rem')
    expect(styles).toContain('background: #16a34a')
    expect(styles).not.toContain('#ffc4df')
    expect(styles).not.toContain('pink')
  })
})
