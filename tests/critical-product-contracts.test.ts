import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(path: string) {
  return readFileSync(path, 'utf8')
}

describe('LHR critical product contracts', () => {
  it('keeps photographed members ahead of profiles using a default visual', () => {
    const actions = source('actions/user-actions.ts')
    const avatarPriority = actions.indexOf("(NULLIF(BTRIM(u.avatar), '') IS NOT NULL) DESC")
    const directoryOrder = actions.indexOf('ORDER BY', actions.indexOf('export async function searchCommunityMembers'))

    expect(avatarPriority).toBeGreaterThan(directoryOrder)
  })

  it('keeps the member directory reachable from both navigation entry points', () => {
    expect(source('components/site-shell.tsx')).toContain("href: '/members'")
    expect(source('app/discover/page.tsx')).toContain("href='/members'")
  })

  it('keeps typed default photos centralized on every member surface', () => {
    for (const path of [
      'app/members/page.tsx',
      'app/discover/page.tsx',
      'app/matches/page.tsx',
      'app/profile/[id]/page.tsx'
    ]) {
      expect(source(path), path).toContain("@/lib/default-member-image")
    }

    const defaults = source('lib/default-member-image.ts')
    expect(defaults).toContain('/default-member-man.jpg')
    expect(defaults).toContain('/default-member-woman.jpg')
    expect(defaults).toContain('/default-member-couple.jpg')
  })

  it('keeps the Compliance protections in the release verification', () => {
    const packageJson = source('package.json')
    expect(packageJson).toContain('verify:critical')
    expect(packageJson).toContain('verify:release')
  })

  it('keeps the anti-prostitution Compliance widget in the desktop sidebar', () => {
    const shell = source('components/site-shell.tsx')
    expect(shell).toContain('/compliance-prostitution-interdite.png')
    expect(shell).toContain("href='/community-safety'")
    expect(shell).toContain('Prostitution interdite')
  })
})
