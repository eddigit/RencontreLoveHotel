export type AdminUserFilter = 'all' | 'woman' | 'man' | 'couple' | 'other'
export type AdminPhotoFilter = 'all' | 'with-photo' | 'without-photo'

export type FilterableAdminUser = {
  id?: string
  name?: string
  email?: string
  location?: string
  gender?: string | null
  profile_status?: string | null
  has_eligible_photo?: boolean
  moderator_spotlight_at?: string | boolean | null
  admin_starred?: boolean
}

const normalise = (value?: string | null) => value?.trim().toLowerCase() || ''

/** Groups the profile values currently stored in LHR without assuming a fixed enum. */
export function getAdminUserCategory (user: Pick<FilterableAdminUser, 'gender' | 'profile_status'>): Exclude<AdminUserFilter, 'all'> {
  const values = `${normalise(user.gender)} ${normalise(user.profile_status)}`
  if (values.includes('couple')) return 'couple'
  if (/(female|woman|femme)/.test(values)) return 'woman'
  if (/(male|man|homme)/.test(values)) return 'man'
  return 'other'
}

export function filterAdminUsers<T extends FilterableAdminUser> (
  users: T[],
  filters: { search: string, photo: AdminPhotoFilter, category: AdminUserFilter, starredOnly: boolean, unstarredOnly?: boolean, moderatorsOnly?: boolean }
) {
  const query = normalise(filters.search)
  return users.filter(user => {
    const hasPhoto = Boolean(user.has_eligible_photo)
    const matchesPhoto = filters.photo === 'all' || (filters.photo === 'with-photo' ? hasPhoto : !hasPhoto)
    const haystack = `${user.name || ''} ${user.email || ''} ${user.location || ''}`.toLowerCase()
    return matchesPhoto &&
      (!filters.moderatorsOnly || Boolean(user.moderator_spotlight_at)) &&
      (!filters.starredOnly || Boolean(user.admin_starred)) &&
      (!filters.unstarredOnly || !user.admin_starred) &&
      (filters.category === 'all' || getAdminUserCategory(user) === filters.category) &&
      (!query || user.id === query || haystack.includes(query))
  })
}
