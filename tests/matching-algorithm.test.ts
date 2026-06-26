import { describe, expect, it } from 'vitest'
import { calculateMatchScore } from '../utils/matching-algorithm'

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
})
