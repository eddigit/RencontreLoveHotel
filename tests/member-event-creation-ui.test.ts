import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('member event submission UI', () => {
  it('uploads a validated cover and explains moderation before submission', () => {
    const page = readFileSync('app/events/new.tsx', 'utf8')

    expect(page).toContain("fetch('/api/events/upload-cover'")
    expect(page).toContain('FormData')
    expect(page).toContain("accept='image/jpeg,image/png,image/webp'")
    expect(page).toContain('Votre proposition est relue par l’équipe avant publication')
    expect(page).toContain('Aperçu de la couverture')
    expect(page).toContain("publication_status: 'pending_review'")
  })

  it('shows the member moderation status without placing pending events in the public query', () => {
    const page = readFileSync('app/events/page.tsx', 'utf8')
    const actions = readFileSync('actions/event-actions.ts', 'utf8')

    expect(page).toContain('getMyEventSubmissions')
    expect(page).toContain('Mes propositions d’événements')
    expect(page).toContain('À valider')
    expect(actions).toContain("publication_status <> 'published'")
  })
})
