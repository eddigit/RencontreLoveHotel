import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('relationship flow UI', () => {
  it('makes the profile page explain that messaging opens after accepted match', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    const form = readFileSync('components/profile-message-form.tsx', 'utf8')

    expect(page).toContain('Message ouvert')
    expect(page).toContain('Après match accepté')
    expect(page).toContain('Love Room')
    expect(page).toContain('Événement')
    expect(form).toContain('Conversation fluide')
  })

  it('makes matches page a clear relationship workflow', () => {
    const page = readFileSync('app/matches/page.tsx', 'utf8')

    expect(page).toContain('Demandes à traiter')
    expect(page).toContain('Conversation ouverte')
    expect(page).toContain('Rencontre réelle')
    expect(page).toContain('Écrire')
  })
})
