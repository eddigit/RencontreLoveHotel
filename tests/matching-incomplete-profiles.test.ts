import { describe, expect, it } from 'vitest'
import { calculateMatchScore, type UserProfile } from '@/utils/matching-algorithm'

function incompleteProfile(id: string): UserProfile {
  return {
    id,
    name: id,
    age: 0,
    location: '',
    image: '',
    online: false,
    preferences: {}
  }
}

describe('matching incomplete profiles', () => {
  it('does not award compatibility points for criteria missing on both profiles', () => {
    expect(
      calculateMatchScore(incompleteProfile('member-a'), incompleteProfile('member-b'))
    ).toBe(30)
  })
})
