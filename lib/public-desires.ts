import { bdsmRoleOptions, relationshipIntentOptions } from './member-profile-types'
import { parseProfileTags } from './profile-likes-dislikes'

export function publicDesires(profile: {
  relationship_intents?: unknown
  bdsm_roles?: unknown
  bdsm_roles_public?: boolean | null
}) {
  const intents = parseProfileTags(profile.relationship_intents)
  const roles = profile.bdsm_roles_public === true ? parseProfileTags(profile.bdsm_roles) : []
  return [
    ...relationshipIntentOptions.filter(option => intents.includes(option.value)),
    ...bdsmRoleOptions.filter(option => option.value !== 'none' && roles.includes(option.value))
      .map(option => ({ ...option, label: `BDSM · ${option.label}` }))
  ]
}
