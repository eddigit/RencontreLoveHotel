import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('admin event moderation UI', () => {
  it('exposes the moderation queue and guarded decisions', () => {
    const page = readFileSync('app/admin/events/page.tsx', 'utf8')

    expect(page).toContain('getPendingEventModeration')
    expect(page).toContain('moderateEvent')
    expect(page).toContain('Propositions à valider')
    expect(page).toContain('Demander une correction')
    expect(page).toContain('Refuser')
    expect(page).toContain('Publier')
    expect(page).toContain('/profile/${event.creator_id}')
  })
})
