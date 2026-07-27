import { describe, expect, it } from 'vitest'
import { rankDiscoveryCandidates, rotateDiscoveryBatch } from '@/lib/discovery-ranking'

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

  it('keeps members with a personal photo ahead of native-avatar profiles', () => {
    const ranked = rankDiscoveryCandidates([
      { id: 'native', image: '/default-member-woman.jpg', matchScore: 100, impressions14d: 0, profileQuality: 100 },
      { id: 'photo', image: 'https://blob.example/member.jpg', matchScore: 60, impressions14d: 4, profileQuality: 60 }
    ], { viewerId: 'viewer', batch: 0 })

    expect(ranked[0].id).toBe('photo')
  })

  it('treats legacy native avatars as profiles without a personal photo', () => {
    const ranked = rankDiscoveryCandidates([
      { id: 'legacy-native', image: '/mystical-forest-spirit.png', impressions14d: 0 },
      { id: 'photo', image: 'https://blob.example/member.jpg', impressions14d: 2 }
    ], { viewerId: 'viewer', batch: 0 })

    expect(ranked[0].id).toBe('photo')
  })

  it('puts member-uploaded photos ahead of OAuth avatars that may only contain initials', () => {
    const ranked = rankDiscoveryCandidates([
      {
        id: 'oauth-avatar',
        image: 'https://lh3.googleusercontent.com/a/generated-avatar=s96-c',
        impressions14d: 0
      },
      {
        id: 'uploaded-photo',
        image: 'https://member.public.blob.vercel-storage.com/user-avatar.jpg',
        impressions14d: 4
      }
    ], { viewerId: 'viewer', batch: 0 })

    expect(ranked[0].id).toBe('uploaded-photo')
  })

  it('shows unseen members first within the personal-photo group', () => {
    const ranked = rankDiscoveryCandidates([
      {
        id: 'already-seen',
        image: 'https://blob.example/member.jpg',
        matchScore: 100,
        impressions14d: 4,
        profileQuality: 100
      },
      {
        id: 'unseen',
        image: 'https://blob.example/another-member.jpg',
        matchScore: 50,
        impressions14d: 0,
        profileQuality: 50
      }
    ], { viewerId: 'viewer', batch: 0 })

    expect(ranked.map(item => item.id)).toEqual(['unseen', 'already-seen'])
  })

  it('rotates the visible discovery window when the member asks for another batch', () => {
    const ranked = Array.from({ length: 30 }, (_, index) => ({ id: `profile-${index + 1}` }))

    expect(rotateDiscoveryBatch(ranked, 0, 12).slice(0, 12).map(item => item.id))
      .toEqual(ranked.slice(0, 12).map(item => item.id))
    expect(rotateDiscoveryBatch(ranked, 1, 12).slice(0, 12).map(item => item.id))
      .toEqual(ranked.slice(12, 24).map(item => item.id))
    expect(rotateDiscoveryBatch(ranked, 2, 12).slice(0, 6).map(item => item.id))
      .toEqual(ranked.slice(24, 30).map(item => item.id))
  })
})
