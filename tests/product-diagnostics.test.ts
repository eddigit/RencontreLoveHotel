import { describe, expect, it } from 'vitest'
import { buildProductDiagnostic } from '@/lib/product-diagnostics'

const stagnant = {
  accounts: 1308,
  profileRows: 1046,
  eligibleProfiles: 1017,
  profilesWithMedia: 252,
  profilesWithBio: 178,
  completeProfiles: 99,
  uniqueExposed30d: 8,
  impressions30d: 80,
  matchRequests: 2723,
  pendingMatches: 2432,
  acceptedMatches: 265,
  rejectedMatches: 26,
  conversations: 318,
  startedConversations: 178,
  reciprocalConversations: 23,
  messages30d: 0,
  futureEvents: 0,
  eventParticipants: 43,
  openReports: 0,
  schemaReady: 4,
  schemaExpected: 6
}

describe('LHR product diagnostic engine', () => {
  it('builds bounded scores and prioritizes critical stagnation', () => {
    const diagnostic = buildProductDiagnostic(stagnant)

    expect(diagnostic.overallScore).toBeGreaterThanOrEqual(0)
    expect(diagnostic.overallScore).toBeLessThanOrEqual(100)
    expect(Object.values(diagnostic.pillarScores).every(score => score >= 0 && score <= 100)).toBe(true)
    expect(diagnostic.actions[0].severity).toBe('critical')
    expect(diagnostic.actions.map(action => action.id)).toContain('no-upcoming-events')
    expect(diagnostic.actions.map(action => action.id)).toContain('pending-match-backlog')
    expect(diagnostic.actions.map(action => action.id)).toContain('low-profile-quality')
  })

  it('reports the complete account-to-conversation funnel', () => {
    const diagnostic = buildProductDiagnostic(stagnant)
    expect(diagnostic.funnel.map(step => step.label)).toEqual([
      'Comptes',
      'Profils',
      'Profils affichables',
      'Matchs acceptés',
      'Conversations démarrées',
      'Conversations réciproques',
      'Participations événements'
    ])
  })
})
