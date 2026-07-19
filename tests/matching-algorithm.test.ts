import { describe, expect, it } from 'vitest'
import { calculateMatchScore, hasPersonalPhoto, isMutuallyTargeted, sortProfilesByCompatibility } from '../utils/matching-algorithm'

const baseProfile = {
  id: 'user-a',
  name: 'A',
  age: 34,
  location: 'Paris',
  image: '',
  online: true,
  preferences: {
    status: 'single_male',
    age: 34,
    orientation: 'hetero',
    gender: 'male',
    birthday: '1992-01-01',
    interested_in_restaurant: true,
    interested_in_events: true,
    interested_in_dating: true,
    prefer_curtain_open: true,
    meetingTypes: {
      friendly: true,
      romantic: true,
      playful: true,
      open_curtains: true,
      libertine: false
    },
    open_to_other_couples: false,
    join_exclusive_events: true,
    premium_access: true,
    suggestions: '',
    specific_preferences: ''
  }
} as any

describe('matching algorithm', () => {
  it('does not alter compatibility for premium or featured profiles', () => {
    const other = {
      ...baseProfile,
      id: 'other',
      featured: false,
      preferences: { ...baseProfile.preferences, premium_access: false }
    } as any
    const promoted = {
      ...other,
      featured: true,
      preferences: { ...other.preferences, premium_access: true }
    } as any

    expect(calculateMatchScore(baseProfile, promoted)).toBe(calculateMatchScore(baseProfile, other))
  })

  it('scores real database-shaped profile preferences with snake_case fields', () => {
    const userB = {
      ...baseProfile,
      id: 'user-b',
      name: 'B',
      age: 31,
      preferences: {
        status: 'single_female',
        age: 31,
        orientation: 'hetero',
        gender: 'female',
        interested_in_restaurant: true,
        interested_in_events: true,
        interested_in_dating: true,
        prefer_curtain_open: true,
        meetingTypes: {
          friendly: true,
          romantic: true,
          playful: true,
          open_curtains: true,
          libertine: false
        },
        open_to_other_couples: false,
        join_exclusive_events: true,
        premium_access: true
      }
    } as any

    expect(calculateMatchScore(baseProfile, userB)).toBeGreaterThanOrEqual(80)
  })

  it('rewards couple and libertine compatibility when both sides are open to couples', () => {
    const couple = {
      ...baseProfile,
      id: 'couple',
      age: 38,
      preferences: {
        ...baseProfile.preferences,
        status: 'couple',
        gender: 'couple_mf',
        orientation: 'bi',
        meetingTypes: {
          playful: true,
          open_curtains: true,
          libertine: true
        },
        open_to_other_couples: true,
        join_exclusive_events: true
      }
    } as any
    const openSingle = {
      ...baseProfile,
      id: 'open-single',
      preferences: {
        ...baseProfile.preferences,
        status: 'single_female',
        gender: 'female',
        orientation: 'bi',
        meetingTypes: {
          playful: true,
          open_curtains: true,
          libertine: true
        },
        open_to_other_couples: true,
        join_exclusive_events: true
      }
    } as any

    expect(calculateMatchScore(couple, openSingle)).toBeGreaterThanOrEqual(75)
  })

  it('requires mutual profile targeting only when both profiles made explicit choices', () => {
    const woman = {
      ...baseProfile,
      id: 'woman',
      preferences: { ...baseProfile.preferences, status: 'single_female', gender: 'female', seeking_profile_types: ['male'] }
    } as any
    const targetedMan = {
      ...baseProfile,
      preferences: { ...baseProfile.preferences, seeking_profile_types: ['female'] }
    } as any
    const incompatibleMan = {
      ...baseProfile,
      preferences: { ...baseProfile.preferences, seeking_profile_types: ['couple'] }
    } as any

    expect(isMutuallyTargeted(targetedMan, woman)).toBe(true)
    expect(calculateMatchScore(targetedMan, woman)).toBeGreaterThanOrEqual(30)
    expect(isMutuallyTargeted(incompatibleMan, woman)).toBe(false)
    expect(calculateMatchScore(incompatibleMan, woman)).toBe(0)
    expect(isMutuallyTargeted(baseProfile, woman)).toBe(true)
  })

  it('rewards shared intentions and complementary BDSM roles', () => {
    const dominant = {
      ...baseProfile,
      preferences: { ...baseProfile.preferences, relationship_intents: ['regular'], bdsm_roles: ['dominant'] }
    } as any
    const submissive = {
      ...baseProfile,
      id: 'submissive',
      preferences: { ...baseProfile.preferences, relationship_intents: ['regular'], bdsm_roles: ['submissive'] }
    } as any
    const noBdsm = {
      ...submissive,
      preferences: { ...submissive.preferences, bdsm_roles: ['none'] }
    } as any

    expect(calculateMatchScore(dominant, submissive)).toBeGreaterThan(calculateMatchScore(dominant, noBdsm))
  })

  it('does not mistake native avatars for personal photos and ranks real photos first', () => {
    const native = { ...baseProfile, id: 'native', image: '/default-member-man.jpg' } as any
    const personal = { ...baseProfile, id: 'personal', image: 'https://blob.example/member.jpg' } as any

    expect(hasPersonalPhoto(native)).toBe(false)
    expect(hasPersonalPhoto(personal)).toBe(true)
    expect(sortProfilesByCompatibility(baseProfile, [native, personal])[0].id).toBe('personal')
  })
})
