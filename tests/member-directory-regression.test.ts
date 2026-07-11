import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member directory navigation regression', () => {
  it('keeps the full member directory reachable from navigation and Discover', () => {
    expect(existsSync('app/members/page.tsx')).toBe(true)

    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const discover = readFileSync('app/discover/page.tsx', 'utf8')

    expect(shell).toContain("href: '/members'")
    expect(shell).toContain("label: 'Rechercher'")
    expect(discover).toContain("href='/members'")
    expect(discover).not.toContain("href='#new-profiles'\n              className='flex items-center")
  })
})
