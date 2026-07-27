export type DiscoveryCandidate = {
  id: string
  matchScore?: number | null
  impressions14d?: number | string | null
  profileQuality?: number | null
  lastSeenAt?: string | Date | null
  createdAt?: string | Date | null
  image?: string | null
  avatar?: string | null
  featured?: boolean
  [key: string]: unknown
}

export type RankedDiscoveryCandidate<T extends DiscoveryCandidate = DiscoveryCandidate> = T & {
  discoveryScore: number
  explorationScore: number
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value))
}

function stableUnit(seed: string) {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function freshnessScore(value: string | Date | null | undefined, now: Date) {
  if (!value) return 20
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 20
  const days = Math.max(0, (now.getTime() - timestamp) / 86_400_000)
  if (days <= 1) return 100
  if (days <= 7) return 80
  if (days <= 30) return 60
  if (days <= 90) return 40
  return 20
}

function photoPriority(candidate: DiscoveryCandidate) {
  const nativeAvatarMarkers = [
    '/default-member-',
    '/mystical-forest-spirit',
    '/purple-haze-chat',
    '/serene-woman',
    '/contemplative-portrait'
  ]

  const images = [candidate.avatar, candidate.image]
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean)

  if (images.some(image => image.includes('blob.vercel-storage.com/'))) return 2
  if (images.some(image => !nativeAvatarMarkers.some(marker => image.includes(marker)))) return 1
  return 0
}

export function rankDiscoveryCandidates<T extends DiscoveryCandidate>(
  candidates: T[],
  context: { viewerId: string; batch: number; now?: Date }
): Array<RankedDiscoveryCandidate<T>> {
  const now = context.now || new Date()

  return candidates
    .map(candidate => {
      const compatibility = clamp(Number(candidate.matchScore || 0))
      const impressions = Math.max(0, Number(candidate.impressions14d || 0))
      const exposureDeficit = clamp(100 - impressions * 8)
      const quality = clamp(Number(candidate.profileQuality || 0))
      const freshness = freshnessScore(candidate.lastSeenAt || candidate.createdAt, now)
      const explorationScore = Math.round(stableUnit(`${context.viewerId}:${context.batch}:${candidate.id}`) * 100)
      const discoveryScore = Math.round(
        compatibility * 0.4 +
        freshness * 0.2 +
        exposureDeficit * 0.2 +
        quality * 0.1 +
        explorationScore * 0.1
      )

      return { ...candidate, discoveryScore, explorationScore }
    })
    .sort((left, right) => {
      const photoDifference = photoPriority(right) - photoPriority(left)
      if (photoDifference) return photoDifference
      const impressionDifference =
        Number(left.impressions14d || 0) - Number(right.impressions14d || 0)
      if (impressionDifference) return impressionDifference
      const featuredDifference = Number(Boolean(right.featured)) - Number(Boolean(left.featured))
      if (featuredDifference) return featuredDifference
      return right.discoveryScore - left.discoveryScore || left.id.localeCompare(right.id)
    })
}

export function rotateDiscoveryBatch<T>(
  candidates: T[],
  batch: number,
  windowSize = 12
): T[] {
  const safeWindowSize = Math.max(1, Math.floor(Number(windowSize) || 12))
  const safeBatch = Math.max(0, Math.floor(Number(batch) || 0))
  if (safeBatch === 0 || candidates.length <= safeWindowSize) return candidates

  const offset = (safeBatch * safeWindowSize) % candidates.length
  if (offset === 0) return candidates
  return [...candidates.slice(offset), ...candidates.slice(0, offset)]
}

export function rotateDiscoveryBatchWithPhotoPriority<T extends DiscoveryCandidate>(
  candidates: T[],
  batch: number,
  windowSize = 12
): T[] {
  const uploadedPhotos = candidates.filter(candidate => photoPriority(candidate) === 2)
  const otherPersonalPhotos = candidates.filter(candidate => photoPriority(candidate) === 1)
  const nativeAvatars = candidates.filter(candidate => photoPriority(candidate) === 0)

  return [
    ...rotateDiscoveryBatch(uploadedPhotos, batch, windowSize),
    ...rotateDiscoveryBatch(otherPersonalPhotos, batch, windowSize),
    ...rotateDiscoveryBatch(nativeAvatars, batch, windowSize)
  ]
}
