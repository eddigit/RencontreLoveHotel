import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('premium responsive shell', () => {
  it('keeps the logo bounded and page actions responsive', () => {
    const logo = readFileSync('components/brand-logo.tsx', 'utf8')
    const siteShell = readFileSync('components/site-shell.tsx', 'utf8')
    const pageShell = readFileSync('components/lhr-v2-shell.tsx', 'utf8')
    const events = readFileSync('app/events/page.tsx', 'utf8')

    expect(logo).toContain('max-w-full')
    expect(siteShell).toContain("max-w-[min(60vw,230px)]")
    expect(pageShell).toContain('sm:flex-row')
    expect(pageShell).toContain('flex-wrap')
    expect(events).toContain('/paris-event-limousine.png')
  })
})
