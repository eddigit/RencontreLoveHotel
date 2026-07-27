import { describe, expect, it } from 'vitest'
import {
  rankDiscoveryCandidates,
  rotateDiscoveryBatch,
  rotateDiscoveryBatchWithPhotoPriority
} from '@/lib/discovery-ranking'

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

  it('does not repeat a profile across consecutive local rotations', () => {
    let ranked = Array.from({ length: 60 }, (_, index) => ({ id: `profile-${index + 1}` }))
    const displayed = new Set<string>()

    for (let batch = 0; batch < 5; batch += 1) {
      const visibleIds = ranked.slice(0, 12).map(item => item.id)
      expect(visibleIds.some(id => displayed.has(id))).toBe(false)
      visibleIds.forEach(id => displayed.add(id))
      ranked = rotateDiscoveryBatch(ranked, 1, 12)
    }

    expect(displayed.size).toBe(60)
  })

  it('keeps uploaded-photo profiles visible across every rotation', () => {
    let ranked = [
      ...Array.from({ length: 42 }, (_, index) => ({
        id: `photo-${index + 1}`,
        image: `https://member.public.blob.vercel-storage.com/photo-${index + 1}.jpg`
      })),
      ...Array.from({ length: 60 }, (_, index) => ({
        id: `native-${index + 1}`,
        image: '/default-member-woman.jpg'
      }))
    ]

    for (let batch = 0; batch < 10; batch += 1) {
      expect(ranked.slice(0, 12).every(profile => profile.id.startsWith('photo-'))).toBe(true)
      ranked = rotateDiscoveryBatchWithPhotoPriority(ranked, 1, 12)
    }
  })

  it('rotates fallback profiles while keeping a smaller photo group first', () => {
    const ranked = [
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `photo-${index + 1}`,
        image: `https://member.public.blob.vercel-storage.com/photo-${index + 1}.jpg`
      })),
      ...Array.from({ length: 24 }, (_, index) => ({
        id: `native-${index + 1}`,
        image: '/default-member-man.jpg'
      }))
    ]

    const rotated = rotateDiscoveryBatchWithPhotoPriority(ranked, 1, 12)

    expect(rotated.slice(0, 4).map(profile => profile.id)).toEqual([
      'photo-1',
      'photo-2',
      'photo-3',
      'photo-4'
    ])
    expect(rotated[4].id).toBe('native-13')
  })
})
