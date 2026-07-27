import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultMemberImage } from '@/lib/default-member-image'

const root = process.cwd()

describe('default member images for same-sex couples', () => {
  it('uses distinct default visuals for male and female couples', () => {
    expect(defaultMemberImage({ gender: 'couple_mm' })).toBe('/default-member-couple-mm.jpg')
    expect(defaultMemberImage({ gender: 'couple_ff' })).toBe('/default-member-couple-ff.jpg')
    expect(defaultMemberImage({ profile_status: 'couple', gender: 'couple_mf' })).toBe('/default-member-couple.jpg')
  })

  it('ships the same-sex couple fallback assets', () => {
    expect(existsSync(join(root, 'public/default-member-couple-mm.jpg'))).toBe(true)
    expect(existsSync(join(root, 'public/default-member-couple-ff.jpg'))).toBe(true)
  })
})
