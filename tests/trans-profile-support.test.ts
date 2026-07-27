import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  directoryProfileTypeLabel,
  memberIdentityFromStatus,
  profileTypeOptions,
  seekingProfileTypeOptions
} from '@/lib/member-profile-types'
import { defaultMemberImage } from '@/lib/default-member-image'
import { isMutuallyTargeted } from '@/utils/matching-algorithm'

const root = process.cwd()

function matchingProfile(
  id: string,
  status: string,
  gender: string,
  seekingProfileTypes: string[]
) {
  return {
    id,
    name: id,
    age: 32,
    location: 'Paris',
    image: '',
    online: true,
    preferences: {
      status,
      gender,
      orientation: 'bi',
      seeking_profile_types: seekingProfileTypes
    }
  } as any
}

describe('trans profile support', () => {
  it('offers a trans identity and a trans search target', () => {
    expect(profileTypeOptions).toContainEqual({
      value: 'single_trans',
      label: 'Personne trans'
    })
    expect(seekingProfileTypeOptions).toContainEqual({
      value: 'trans',
      label: 'Personnes trans'
    })
    expect(memberIdentityFromStatus('single_trans')).toEqual({
      status: 'single_trans',
      gender: 'trans'
    })
    expect(directoryProfileTypeLabel({
      profile_status: 'single_trans',
      gender: 'trans'
    })).toBe('Personne trans')
  })

  it('matches members who explicitly seek trans profiles', () => {
    const transMember = matchingProfile(
      'trans-member',
      'single_trans',
      'trans',
      ['male']
    )
    const man = matchingProfile('man', 'single_male', 'male', ['trans'])

    expect(isMutuallyTargeted(man, transMember)).toBe(true)
  })

  it('uses a dedicated faceless default visual for trans profiles', () => {
    expect(defaultMemberImage({ gender: 'trans' })).toBe(
      '/default-member-trans.jpg'
    )
    expect(
      existsSync(join(root, 'public/default-member-trans.jpg'))
    ).toBe(true)
  })

  it('extends the database constraint and member directory filter', () => {
    const migration = readFileSync(
      join(root, 'migrations/20260727_add_trans_profile_type.sql'),
      'utf8'
    )
    const directoryAction = readFileSync(
      join(root, 'actions/user-actions.ts'),
      'utf8'
    )
    const discoverPage = readFileSync(
      join(root, 'app/discover/page.tsx'),
      'utf8'
    )

    expect(migration).toContain(
      "ARRAY['male', 'female', 'couple', 'trans']::text[]"
    )
    expect(directoryAction).toContain("profileType === 'trans'")
    expect(directoryAction).toContain(
      `AND \${targetOrientationHeteroBiCompatibleSQL}) OR \${targetTransEntitiesSQL}`
    )
    expect(directoryAction).toContain(
      `AND \${targetOrientationGayBiCompatibleSQL}) OR \${targetTransEntitiesSQL}`
    )
    expect(discoverPage).toContain("value === 'trans'")
  })
})
