import { describe, expect, it } from 'vitest'
import { rankDiscoveryCandidates } from '@/lib/discovery-ranking'

const candidates = [
  { id: 'popular', matchScore: 80, impressions14d: 30, profileQuality: 90, lastSeenAt: '2026-07-15T10:00:00Z' },
  { id: 'underexposed', matchScore: 80, impressions14d: 0, profileQuality: 90, lastSeenAt: '2026-07-15T10:00:00Z' },
  { id: 'lower-quality', matchScore: 80, impressions14d: 0, profileQuality: 20, lastSeenAt: '2026-07-15T10:00:00Z' }
]

describe('fair discovery ranking', () => {
  it('prioritizes compatible profiles that have been under-exposed', () => {
    const ranked = rankDiscoveryCandidates(candidates, {
      viewerId: 'viewer',
      batch: 0,
      now: new Date('2026-07-15T12:00:00Z')
    })
    expect(ranked[0].id).toBe('underexposed')
    expect(ranked.find(item => item.id === 'underexposed')!.discoveryScore)
      .toBeGreaterThan(ranked.find(item => item.id === 'popular')!.discoveryScore)
  })

  it('keeps a batch stable while rotating the exploration component', () => {
    const context = { viewerId: 'viewer', batch: 2, now: new Date('2026-07-15T12:00:00Z') }
    expect(rankDiscoveryCandidates(candidates, context)).toEqual(rankDiscoveryCandidates(candidates, context))
    expect(rankDiscoveryCandidates(candidates, context).map(item => item.explorationScore))
      .not.toEqual(rankDiscoveryCandidates(candidates, { ...context, batch: 3 }).map(item => item.explorationScore))
  })
})
