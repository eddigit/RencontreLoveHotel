import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile dark redesign', () => {
  it('keeps the portrait, identity and contact action at the start of the profile', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')

    expect(page).toContain("bg-[#04070b]")
    expect(page).toContain("bg-[#0a0f15]")
    expect(page).toContain("bg-[#111821]")
    expect(page).toContain("text-[#ecebe7]")
    expect(page).toContain("text-[#c9c7c2]")
    expect(page).toContain("bg-[#d6bc87]")
    expect(page).toContain("aspect-[4/5]")
    expect(page).toContain("className='object-contain'")
    expect(page.indexOf('Entrer en contact')).toBeLessThan(page.indexOf('Galerie'))
  })

  it('does not invent availability, premium status, distance, compatibility or interests', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')

    expect(page).not.toContain('Disponible ce soir')
    expect(page).not.toContain('>Premium<')
    expect(page).not.toContain('4 km')
    expect(page).not.toContain('compatibilité')
    expect(page).not.toContain("['Jacuzzi', 'Cocktails', 'Dîner privé']")
  })
})
