import type { OnboardingData } from "@/components/onboarding-form"

export interface UserProfile {
  id: string
  name: string
  age: number
  location: string
  image: string
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
}

function boolValue(...values: unknown[]) {
  return values.some(value => value === true || value === 'true' || value === 1)
}

function normalizeGender(value?: string) {
  const gender = String(value || '').toLowerCase()
  if (gender === 'couple') return 'couple_mf'
  return gender
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

function ratioScore(a: string[], b: string[], points: number) {
  if (a.length === 0 || b.length === 0) return 0
  const common = a.filter(value => b.includes(value))
  return (common.length / Math.max(a.length, b.length)) * points
}

function activeMeetingTypes(profile: NormalizedPreferences) {
  return Object.entries(profile.meetingTypes)
    .filter(([, enabled]) => enabled)
    .map(([type]) => type)
}

export function calculateMatchScore(userA: UserProfile, userB: UserProfile): number {
  const a = normalizePreferences(userA)
  const b = normalizePreferences(userB)
  let score = 0

  if (!isCouple(a) && !isCouple(b)) score += 10
  if ((isCouple(a) || isCouple(b)) && (a.openToOtherCouples || b.openToOtherCouples)) score += 18

  if (orientationCompatible(a, b)) score += 22

  score += ratioScore(activeMeetingTypes(a), activeMeetingTypes(b), 24)

  if (a.preferCurtainOpen === b.preferCurtainOpen) score += 8
  if (a.preferCurtainOpen && b.preferCurtainOpen) score += 6
  if (a.meetingTypes.libertine && b.meetingTypes.libertine) score += 10
  if (a.joinExclusiveEvents && b.joinExclusiveEvents) score += 8
  if (a.interestedInEvents && b.interestedInEvents) score += 6
  if (a.interestedInRestaurant && b.interestedInRestaurant) score += 4
  if (a.interestedInDating && b.interestedInDating) score += 4

  const ageDifference = Math.abs((a.age || 0) - (b.age || 0))
  if (a.age && b.age && ageDifference <= 5) score += 8
  else if (a.age && b.age && ageDifference <= 10) score += 4

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function sortProfilesByCompatibility(currentUser: UserProfile, profiles: UserProfile[]): UserProfile[] {
  return [...profiles]
    .map(profile => ({
      ...profile,
      matchScore: calculateMatchScore(currentUser, profile)
    }))
    .sort((a, b) => {
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
