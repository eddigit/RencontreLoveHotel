export type MemberStatus =
  | 'single_male'
  | 'single_female'
  | 'single_trans'
  | 'couple'

export type MemberGender = 'male' | 'female' | 'trans' | 'couple'
export type SeekingProfileType = 'male' | 'female' | 'trans' | 'couple'
export type DirectoryProfileType =
  | 'all'
  | 'couple'
  | 'woman'
  | 'man'
  | 'trans'

export const profileTypeOptions = [
  { value: 'single_male', label: 'Homme seul' },
  { value: 'single_female', label: 'Femme seule' },
  { value: 'single_trans', label: 'Personne trans' },
  { value: 'couple', label: 'Couple' }
] as const

export const seekingProfileTypeOptions = [
  { value: 'male', label: 'Hommes' },
  { value: 'female', label: 'Femmes' },
  { value: 'trans', label: 'Personnes trans' },
  { value: 'couple', label: 'Couples' }
] as const

export function memberIdentityFromStatus(status: MemberStatus) {
  const gender: MemberGender =
    status === 'couple'
      ? 'couple'
      : status === 'single_male'
        ? 'male'
        : status === 'single_female'
          ? 'female'
          : 'trans'

  return { status, gender }
}

export function isTransMemberProfile(profile: {
  status?: string | null
  profile_status?: string | null
  gender?: string | null
}) {
  return [profile.status, profile.profile_status, profile.gender]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes('trans'))
}

export function directoryProfileTypeLabel(profile: {
  status?: string | null
  profile_status?: string | null
  gender?: string | null
}) {
  const status = String(profile.profile_status || profile.status || '').toLowerCase()
  const gender = String(profile.gender || '').toLowerCase()

  if (isTransMemberProfile(profile)) return 'Personne trans'
  if (status.startsWith('couple') || gender.startsWith('couple')) return 'Couple'
  if (
    gender.includes('female') ||
    gender.includes('woman') ||
    status.includes('female') ||
    status.includes('woman')
  ) return 'Femme'
  if (
    gender.includes('male') ||
    gender.includes('man') ||
    status.includes('male') ||
    status.includes('man')
  ) return 'Homme'

  return 'Profil membre'
}
