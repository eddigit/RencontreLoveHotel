import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('visitor landing redesign', () => {
  it('renders the home route with a visitor header and without the application sidebar', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const headerPath = 'components/visitor-landing-header.tsx'
    const header = existsSync(headerPath) ? readFileSync(headerPath, 'utf8') : ''

    expect(existsSync(headerPath)).toBe(true)
    expect(shell).toContain("pathname === '/'")
    expect(shell).toContain('<VisitorLandingHeader')
    expect(shell.indexOf("pathname === '/'")).toBeLessThan(shell.indexOf("<aside className='sticky"))
    expect(header).toContain("href='#concept'")
    expect(header).toContain("href='#hotels'")
    expect(header).toContain("href='#experiences'")
    expect(header).toContain("href='#communaute'")
    expect(header).toContain("href='/login'")
    expect(header).toContain("href='/register'")
  })
})
