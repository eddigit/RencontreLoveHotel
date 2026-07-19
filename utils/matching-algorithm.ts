import type { OnboardingData } from "@/components/onboarding-form"

export interface UserProfile {
  id: string
  name: string
  age: number
  location: string
  image: string
  avatar?: string | null
  online: boolean
  preferences: Partial<OnboardingData> & Record<string, any>
  lastActive?: string
  featured?: boolean
  matchScore?: number
  display_profile?: boolean
}

type NormalizedPreferences = {
  status: string
  gender: string
  orientation: string
  age: number
  interestedInEvents: boolean
  interestedInDating: boolean
  interestedInRestaurant: boolean
  preferCurtainOpen: boolean
  joinExclusiveEvents: boolean
  premiumAccess: boolean
  openToOtherCouples: boolean
  meetingTypes: Record<string, boolean>
  seekingProfileTypes: string[]
  relationshipIntents: string[]
  bdsmRoles: string[]
}

function boolValue(...values: unknown[]) {
  return values.some(value => value === true || value === 'true' || value === 1)
}

function normalizeGender(value?: string) {
  const gender = String(value || '').toLowerCase()
  return gender
}

function arrayValue(...values: unknown[]): string[] {
  const value = values.find(candidate => Array.isArray(candidate))
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map(item => String(item).trim().toLowerCase()).filter(Boolean)))
}

function normalizePreferences(profile: UserProfile): NormalizedPreferences {
  const preferences = profile.preferences || {}
  const meetingTypes = (preferences.meetingTypes || {}) as Record<string, any>

  return {
    status: String(preferences.status || '').toLowerCase(),
    gender: normalizeGender(preferences.gender || preferences.status),
    orientation: String(preferences.orientation || '').toLowerCase(),
    age: Number(profile.age || preferences.age || 0),
    interestedInEvents: boolValue(preferences.interestedInEvents, preferences.interested_in_events),
    interestedInDating: boolValue(preferences.interestedInDating, preferences.interested_in_dating),
    interestedInRestaurant: boolValue(preferences.interestedInRestaurant, preferences.interested_in_restaurant),
    preferCurtainOpen: boolValue(preferences.preferCurtainOpen, preferences.prefer_curtain_open),
    joinExclusiveEvents: boolValue(preferences.joinExclusiveEvents, preferences.join_exclusive_events),
    premiumAccess: boolValue(preferences.premiumAccess, preferences.premium_access),
    openToOtherCouples: boolValue(preferences.openToOtherCouples, preferences.open_to_other_couples),
    seekingProfileTypes: arrayValue(preferences.seekingProfileTypes, preferences.seeking_profile_types),
    relationshipIntents: arrayValue(preferences.relationshipIntents, preferences.relationship_intents),
    bdsmRoles: arrayValue(preferences.bdsmRoles, preferences.bdsm_roles),
    meetingTypes: {
      friendly: boolValue(meetingTypes.friendly),
      romantic: boolValue(meetingTypes.romantic),
      playful: boolValue(meetingTypes.playful),
      open_curtains: boolValue(meetingTypes.openCurtains, meetingTypes.open_curtains),
      libertine: boolValue(meetingTypes.libertine)
    }
  }
}

function isCouple(profile: NormalizedPreferences) {
  return profile.status === 'couple' || profile.gender.startsWith('couple')
}

function profileType(profile: NormalizedPreferences) {
  if (isCouple(profile)) return 'couple'
  if (isFemale(profile)) return 'female'
  if (isMale(profile)) return 'male'
  return ''
}

function isMale(profile: NormalizedPreferences) {
  return ['male', 'single_male', 'married_male', 'couple_mm', 'couple_mf'].includes(profile.gender)
}

function isFemale(profile: NormalizedPreferences) {
  return ['female', 'single_female', 'married_female', 'couple_ff', 'couple_mf'].includes(profile.gender)
}

function likesGender(source: NormalizedPreferences, target: NormalizedPreferences) {
  if (isCouple(source)) return source.openToOtherCouples || source.orientation === 'bi'
  if (source.orientation === 'bi' || source.orientation === 'bisexual') return isMale(target) || isFemale(target) || isCouple(target)
  if (source.orientation === 'hetero' || source.orientation === 'straight') {
    return (isMale(source) && isFemale(target)) || (isFemale(source) && isMale(target)) || isCouple(target)
  }
  if (source.orientation === 'homo' || source.orientation === 'gay') {
    return (isMale(source) && isMale(target)) || (isFemale(source) && isFemale(target))
  }
  return true
}

function orientationCompatible(a: NormalizedPreferences, b: NormalizedPreferences) {
  return likesGender(a, b) && likesGender(b, a)
}

export function isMutuallyTargeted(userA: UserProfile, userB: UserProfile) {
  const a = normalizePreferences(userA)
  const b = normalizePreferences(userB)
  if (a.seekingProfileTypes.length === 0 || b.seekingProfileTypes.length === 0) return true
  return a.seekingProfileTypes.includes(profileType(b)) && b.seekingProfileTypes.includes(profileType(a))
}

function ratioScore(a: string[], b: string[], points: number) {
  if (a.length === 0 || b.length === 0) return 0
  const common = a.filter(value => b.includes(value))
  return (common.length / Math.max(a.length, b.length)) * points
}

function activeMeetingTypes(profile: NormalizedPreferences) {
  const meetingTypes = Object.entries(profile.meetingTypes)
    .filter(([, enabled]) => enabled)
    .map(([type]) => type)
  if (profile.interestedInEvents) meetingTypes.push('events')
  if (profile.interestedInDating) meetingTypes.push('dating')
  if (profile.interestedInRestaurant) meetingTypes.push('restaurant')
  if (profile.preferCurtainOpen) meetingTypes.push('curtain-open')
  return meetingTypes
}

function bdsmCompatible(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return true
  if (a.includes('none') || b.includes('none')) return a.includes('none') && b.includes('none')
  if (a.includes('discovery') && b.includes('discovery')) return true
  if (a.includes('switch') && b.some(role => ['dominant', 'submissive', 'switch'].includes(role))) return true
  if (b.includes('switch') && a.some(role => ['dominant', 'submissive', 'switch'].includes(role))) return true
  return (a.includes('dominant') && b.includes('submissive')) || (a.includes('submissive') && b.includes('dominant'))
}

export function hasPersonalPhoto(profile: Pick<UserProfile, 'image' | 'avatar'>) {
  const image = String(profile.avatar || profile.image || '').trim().toLowerCase()
  if (!image) return false
  return ![
    '/default-member-',
    '/mystical-forest-spirit',
    '/purple-haze-chat',
    '/serene-woman',
    '/contemplative-portrait'
  ].some(marker => image.includes(marker))
}

export function calculateMatchScore(userA: UserProfile, userB: UserProfile): number {
  const a = normalizePreferences(userA)
  const b = normalizePreferences(userB)
  if (!isMutuallyTargeted(userA, userB)) return 0

  let score = 30
  score += a.relationshipIntents.length === 0 || b.relationshipIntents.length === 0
    ? 25
    : ratioScore(a.relationshipIntents, b.relationshipIntents, 25)
  if (orientationCompatible(a, b)) score += 20
  if (bdsmCompatible(a.bdsmRoles, b.bdsmRoles)) score += 15

  const interestsA = activeMeetingTypes(a)
  const interestsB = activeMeetingTypes(b)
  score += interestsA.length === 0 || interestsB.length === 0
    ? 5
    : ratioScore(interestsA, interestsB, 10)

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function sortProfilesByCompatibility(currentUser: UserProfile, profiles: UserProfile[]): UserProfile[] {
  return [...profiles]
    .map(profile => ({
      ...profile,
      matchScore: calculateMatchScore(currentUser, profile)
    }))
    .sort((a, b) => {
      const aHasPhoto = hasPersonalPhoto(a)
      const bHasPhoto = hasPersonalPhoto(b)
      if (aHasPhoto !== bHasPhoto) return aHasPhoto ? -1 : 1
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return (b.matchScore || 0) - (a.matchScore || 0)
    })
}

export function filterCompatibleProfiles(currentUser: UserProfile, profiles: UserProfile[], minScore = 50): UserProfile[] {
  return sortProfilesByCompatibility(currentUser, profiles).filter(
    profile => (profile.matchScore || 0) >= minScore || profile.featured
  )
}
