import { describe, expect, it } from 'vitest'
import { filterAdminUsers, getAdminUserCategory } from '@/lib/admin-user-filters'

const users = [
  { name: 'Alice', email: 'alice@example.test', gender: 'single_female', has_eligible_photo: true, admin_starred: true },
  { name: 'Marc', email: 'marc@example.test', gender: 'male', has_eligible_photo: false },
  { name: 'Lou & Sam', email: 'couple@example.test', gender: 'couple_mf', has_eligible_photo: true },
  { name: 'Noa', email: 'noa@example.test', gender: 'trans', has_eligible_photo: true }
]

describe('admin user filters', () => {
  it('groups the profile values stored by LHR into useful visual categories', () => {
    expect(getAdminUserCategory(users[0])).toBe('woman')
    expect(getAdminUserCategory(users[1])).toBe('man')
    expect(getAdminUserCategory(users[2])).toBe('couple')
    expect(getAdminUserCategory(users[3])).toBe('other')
  })

  it('combines text, photo, category and featured filters', () => {
    expect(filterAdminUsers(users, { search: 'alice', photo: 'with-photo', category: 'woman', starredOnly: true }))
      .toEqual([users[0]])
    expect(filterAdminUsers(users, { search: '', photo: 'without-photo', category: 'all', starredOnly: false }))
      .toEqual([users[1]])
  })
})
