import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('my profile matching UI', () => {
  it('turns /profile into a modern matching control center', () => {
    const page = readFileSync('app/profile/page.tsx', 'utf8')
    const editor = readFileSync('components/UserProfileEditor.tsx', 'utf8')
    const preferences = readFileSync('components/PreferencesEditor.tsx', 'utf8')

    expect(page).toContain('Profil matching')
    expect(page).toContain('Score profil')
    expect(page).toContain('Ce qui aide à matcher')
    expect(page).toContain('Love Rooms')
    expect(page).toContain('Événements')
    expect(page).toContain('LhrV2Shell')
    expect(editor).toContain('Statut relationnel')
    expect(editor).toContain('Homme seul')
    expect(editor).toContain('Femme seule')
    expect(editor).toContain('Couple')
    expect(preferences).toContain('Intentions de rencontre')
    expect(preferences).toContain('Apéro jacuzzi')
    expect(preferences).toContain('Rideaux ouverts')
  })
})
