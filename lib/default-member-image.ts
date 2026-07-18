export type MemberImageProfile = {
  avatar?: string | null
  image?: string | null
  status?: string | null
  profile_status?: string | null
  gender?: string | null
  preferences?: {
    status?: string | null
    gender?: string | null
  } | null
}

export function defaultMemberImage(profile: MemberImageProfile) {
  const suppliedImage = String(profile.avatar || profile.image || '').trim()
  if (suppliedImage) return suppliedImage

  const type = [
    profile.profile_status,
    profile.status,
    profile.gender,
    profile.preferences?.status,
    profile.preferences?.gender
  ].filter(Boolean).join(' ').toLowerCase()

  if (type.includes('couple')) return '/default-member-couple.jpg'
  if (type.includes('female') || type.includes('woman') || type.includes('femme')) {
    return '/default-member-woman.jpg'
  }
  if (type.includes('male') || type.includes('man') || type.includes('homme')) {
    return '/default-member-man.jpg'
  }

  return '/default-member-couple.jpg'
}
