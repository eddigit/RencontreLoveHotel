import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('event participation UI', () => {
  const listPage = readFileSync('app/events/page.tsx', 'utf8')
  const card = readFileSync('components/event-card.tsx', 'utf8')
  const detail = readFileSync('app/events/[id]/EventDetailPage.tsx', 'utf8')

  it('shows one primary participation action with explicit states', () => {
    expect(card).toContain('Demander à participer')
    expect(card).toContain('Demande envoyée')
    expect(card).toContain('Participation acceptée')
    expect(card).toContain('Vous organisez')
    expect(card).not.toContain('Voir les détails')
  })

  it('lets organizers review member profiles and decide requests', () => {
    expect(listPage).toContain('Demandes reçues')
    expect(listPage).toContain('decideEventParticipation')
    expect(listPage).toContain('/profile/')
    expect(listPage).toContain('Accepter')
    expect(listPage).toContain('Refuser')
  })

  it('uses the same server actions from the event detail', () => {
    expect(detail).toContain('requestEventParticipation')
    expect(detail).toContain('withdrawEventParticipation')
    expect(detail).not.toContain("fetch(`/api/events/")
    expect(detail).toContain('isLoading')
  })
})
