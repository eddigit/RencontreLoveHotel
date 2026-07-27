import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile navigation and presence', () => {
  it('returns to the previous screen instead of forcing discovery defaults', () => {
    const profilePage = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    const backButton = readFileSync('components/member-profile-back-button.tsx', 'utf8')

    expect(profilePage).toContain('MemberProfileBackButton')
    expect(backButton).toContain('router.back()')
    expect(profilePage).not.toContain("<Link href='/discover'>")
  })

  it('shows online presence on profile and match avatars', () => {
    const profilePage = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    const matchesPage = readFileSync('app/matches/page.tsx', 'utf8')
    const relationships = readFileSync('lib/member-relationship-service.ts', 'utf8')

    expect(profilePage).toContain('profileOnline &&')
    expect(matchesPage).toContain('profile.online &&')
    expect(relationships).toContain('AS other_user_online')
  })
})
