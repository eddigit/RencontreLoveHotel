import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile UI', () => {
  it('uses a compact responsive profile layout with honest member data', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    const gallery = readFileSync('components/UserGallery.tsx', 'utf8')

    expect(page).toContain("data-testid='profile-summary'")
    expect(page).toContain("data-testid='profile-portrait'")
    expect(page).toContain("data-testid='profile-primary-action'")
    expect(page).toContain("data-testid='profile-mobile-action'")
    expect(page).toContain('À propos')
    expect(page).toContain('Galerie')
    expect(page).toContain('Ce profil n’a pas encore ajouté de présentation.')
    expect(page).toContain('/default-member-couple.jpg')
    expect(page).toContain('/default-member-woman.jpg')
    expect(page).toContain('/default-member-man.jpg')
    expect(page).not.toContain('min-h-[640px]')
    expect(page).not.toContain('4 km')
    expect(page).not.toContain('Disponible ce soir')
    expect(page).not.toContain('compatibilityFromProfile')
    expect(gallery).toContain("data-testid='profile-gallery-grid'")
    expect(gallery).toContain('grid-cols-2')
  })
})
