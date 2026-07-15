import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const shellSource = readFileSync(join(process.cwd(), 'components/lhr-v2-shell.tsx'), 'utf8')
const discoverSource = readFileSync(join(process.cwd(), 'app/discover/page.tsx'), 'utf8')
const pageSource = readFileSync(join(process.cwd(), 'app/members/page.tsx'), 'utf8')

describe('member directory UI', () => {
  it('exposes member search from the authenticated sidebar', () => {
    expect(shellSource).toContain("href: '/members'")
    expect(shellSource).toContain("label: 'Rechercher'")
    expect(discoverSource).toContain("href='/members'")
    expect(discoverSource).toContain('Rechercher des membres')
    expect(pageSource).toContain('searchCommunityMembers')
    expect(pageSource).toContain('Tous les membres')
    expect(pageSource).toContain('Filtrer les membres')
    expect(pageSource).toContain('profileType')
    expect(pageSource).toContain('meetingCriterion')
    expect(pageSource).toContain('totalCount')
    expect(pageSource).toContain('totalPages')
    expect(pageSource).toContain('/default-member-couple.jpg')
    expect(pageSource).toContain('/default-member-woman.jpg')
    expect(pageSource).toContain('/default-member-man.jpg')
  })
})
