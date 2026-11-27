import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('profile biography integrity', () => {
  it('never presents a fabricated marketing biography as member-authored content', () => {
    const discover = readFileSync('app/discover/page.tsx', 'utf8')
    const profile = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    const members = readFileSync('components/member-directory-card.tsx', 'utf8')

    expect(discover).not.toContain('Profil disponible pour une rencontre élégante autour du Love Hotel.')
    expect(profile).not.toContain('Une personnalité élégante et spontanée.')
    expect(profile).not.toContain('Rencontre élégante, lieu discret, ambiance premium')
    expect(members).not.toContain('Profil disponible pour une rencontre dans la communauté.')
  })

  it('shows an explicit empty state when a member has not supplied a biography', () => {
    const discover = readFileSync('app/discover/page.tsx', 'utf8')
    const profile = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    const members = readFileSync('components/member-directory-card.tsx', 'utf8')
    expect(discover).toContain('profile.location || profile.bio ||')
    expect(profile).toContain("profile.bio?.trim() || 'Ce membre n’a pas encore rédigé sa présentation.'")
    expect(members).toContain('member.bio &&')
  })
})
