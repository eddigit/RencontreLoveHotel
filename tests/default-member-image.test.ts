import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

async function loadDefaultMemberImage() {
  try {
    return (await import('../lib/default-member-image')).defaultMemberImage
  } catch {
    return undefined
  }
}

describe('default member images', () => {
  it('keeps a real profile photo when one exists', async () => {
    const defaultMemberImage = await loadDefaultMemberImage()
    expect(defaultMemberImage).toBeTypeOf('function')
    if (!defaultMemberImage) throw new Error('defaultMemberImage is unavailable')
    expect(defaultMemberImage({ avatar: ' https://images.example/member.jpg ', gender: 'female' }))
      .toBe('https://images.example/member.jpg')
  })

  it.each([
    [{ status: 'couple_mf' }, '/default-member-couple.jpg'],
    [{ gender: 'single_female' }, '/default-member-woman.jpg'],
    [{ status: 'single_male' }, '/default-member-man.jpg']
  ])('selects the established typed image for %o', async (profile, expected) => {
    const defaultMemberImage = await loadDefaultMemberImage()
    expect(defaultMemberImage).toBeTypeOf('function')
    if (!defaultMemberImage) throw new Error('defaultMemberImage is unavailable')
    expect(defaultMemberImage(profile)).toBe(expected)
  })

  it('uses the neutral couple visual when the profile type is missing', async () => {
    const defaultMemberImage = await loadDefaultMemberImage()
    expect(defaultMemberImage).toBeTypeOf('function')
    if (!defaultMemberImage) throw new Error('defaultMemberImage is unavailable')
    expect(defaultMemberImage({})).toBe('/default-member-couple.jpg')
  })

  it('keeps all member surfaces on the shared typed fallback', () => {
    for (const path of [
      'app/members/page.tsx',
      'app/discover/page.tsx',
      'app/matches/page.tsx',
      'app/profile/[id]/page.tsx'
    ]) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).toContain("@/lib/default-member-image")
      expect(source, path).not.toContain("|| '/elegant-woman-purple-glow.png'")
    }
  })
})
