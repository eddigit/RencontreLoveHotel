import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile dark redesign', () => {
  it('keeps the portrait, identity and contact action at the start of the profile', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')

    expect(page).toContain("bg-[#181819]")
    expect(page).toContain("Ce membre n’a pas encore rédigé sa présentation.")
    expect(page).toContain("bg-[#111821]")
    expect(page).toContain("text-[#ecebe7]")
    expect(page).toContain("text-[#c9c7c2]")
    expect(page).toContain("bg-[#d6bc87]")
    expect(page).toContain("aspect-square w-20")
    for (const section of ['descriptif', 'gouts', 'galerie', 'mots']) {
      expect(page).toContain(`id='${section}'`)
      expect(page).toContain(`href='#${section}'`)
    }
    expect(page).toContain('object-cover object-[center_35%]')
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
