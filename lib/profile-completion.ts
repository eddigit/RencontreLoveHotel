export type ProfileCompletionInput = {
  name?: string | null
  avatar?: string | null
  age?: number | string | null
  location?: string | null
  status?: string | null
  orientation?: string | null
  gender?: string | null
  bio?: string | null
  interests?: unknown[] | null
  photoCount?: number
  hasDatingPreference?: boolean
  hasMeetingIntent?: boolean
}

const checks: Array<{
  label: string
  complete: (profile: ProfileCompletionInput) => boolean
}> = [
  { label: 'Ajouter un nom', complete: profile => Boolean(profile.name?.trim()) },
  { label: 'Ajouter une photo principale', complete: profile => Boolean(profile.avatar) },
  { label: 'Renseigner votre âge', complete: profile => Number(profile.age || 0) >= 18 },
  { label: 'Ajouter votre ville', complete: profile => Boolean(profile.location?.trim()) },
  { label: 'Préciser votre statut', complete: profile => Boolean(profile.status?.trim()) },
  { label: 'Préciser votre orientation', complete: profile => Boolean(profile.orientation?.trim()) },
  { label: 'Préciser votre profil', complete: profile => Boolean(profile.gender?.trim()) },
  { label: 'Ajouter une bio', complete: profile => Boolean(profile.bio?.trim()) },
  { label: 'Choisir des centres d’intérêt', complete: profile => Boolean(profile.interests?.length) },
  { label: 'Ajouter des photos à la galerie', complete: profile => Number(profile.photoCount || 0) > 0 },
  { label: 'Choisir vos préférences', complete: profile => Boolean(profile.hasDatingPreference) },
  { label: 'Préciser vos intentions de rencontre', complete: profile => Boolean(profile.hasMeetingIntent) }
]

export function calculateProfileCompletion(profile: ProfileCompletionInput) {
  const completed = checks.map(check => check.complete(profile))
  return {
    score: Math.round((completed.filter(Boolean).length / checks.length) * 100),
    completedCount: completed.filter(Boolean).length,
    totalCount: checks.length,
    nextActions: checks.filter((_, index) => !completed[index]).map(check => check.label)
  }
}
