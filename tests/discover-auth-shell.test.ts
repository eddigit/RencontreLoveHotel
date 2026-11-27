import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Discover authenticated shell', () => {
  it('uses the dark circle shell on discover, the agenda, the concierge and the messenger', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const styles = readFileSync('components/site-shell.module.css', 'utf8')

    expect(shell).toContain("const isMemberShell = Boolean(user)")
    expect(shell).toContain("const isCircleShell = Boolean(user && (pathname === '/discover' || pathname === '/events' || pathname === '/members' || pathname === '/conciergerie' || pathname === '/messages' || pathname.startsWith('/messages/')))")
    expect(shell).toContain('isMemberShell && styles.discoverShell')
    expect(shell).toContain('isMemberShell && styles.rail')
    expect(shell).toContain('isMemberShell && styles.panel')
    expect(shell).toContain('isCircleShell && styles.stitchDiscoverShell')
    expect(shell).toContain('isCircleShell && styles.stitchRail')
    expect(shell).toContain('isCircleShell && styles.stitchPanel')
    expect(shell).toContain("<form action='/members' className={styles.searchForm} role='search'>")
    expect(shell).toContain("name='search'")
    expect(shell).toContain("data-chat-thread={/^\\/messages\\/[^/]+\\/?$/.test(pathname) || undefined}")
    expect(styles).toContain('--discover-canvas: #04070b')
    expect(styles).toContain('--discover-charcoal: #101113')
    expect(styles).toContain('.stitchDiscoverShell')
    expect(styles).toContain('--discover-canvas: #121315')
    expect(styles).toContain('--discover-accent: #d6bc87')
    expect(shell).toContain("href='/discover#boite-a-idees'")
    expect(shell).not.toContain('Cercle actif')
  })

  it('presents discoverable members in a compact scrollable portrait strip', () => {
    const portraits = readFileSync('components/community-portraits.tsx', 'utf8')
    const styles = readFileSync('components/site-shell.module.css', 'utf8')

    expect(portraits).toContain('Membres du cercle')
    expect(portraits).toContain("href='/members'")
    expect(portraits).toContain('styles.communityStrip')
    expect(portraits).toContain('styles.onlineDot')
    expect(styles).toContain('flex-basis: 4.25rem')
    expect(styles).toMatch(/\.portraitItem\s*\{[^}]*min-width: 0/)
    expect(styles).toMatch(/\.portraitName\s*\{[^}]*-webkit-line-clamp: 2/)
    expect(styles).toMatch(/\.portraitName\s*\{[^}]*overflow-wrap: anywhere/)
    expect(styles).toContain('background: #10b981')
    expect(styles).not.toContain('#ffc4df')
    expect(styles).not.toContain('pink')
  })
})
