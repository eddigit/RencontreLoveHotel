import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('relationship flow UI', () => {
  it('keeps the profile page contact actions and real meeting paths', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    const form = readFileSync('components/profile-message-form.tsx', 'utf8')

    expect(page).toContain('Entrer en contact')
    expect(page).toContain('MatchRequestButton')
    expect(page).toContain('ProfileMessageForm')
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
