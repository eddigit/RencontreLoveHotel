type IdentifiedProfile = {
  id: string
}

export function discoverySnapshotKey(
  userId: string,
  filters: unknown,
  search: string,
  batch: number
) {
  return [
    'lhr-discovery-v4',
    userId,
    JSON.stringify(filters),
    search.trim().toLowerCase(),
    Math.max(0, Math.floor(Number(batch) || 0))
  ].join(':')
}

export function orderProfilesFromSnapshot<T extends IdentifiedProfile>(
  profiles: T[],
  snapshotIds: string[]
) {
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]))
  const restored = snapshotIds
    .map(id => profilesById.get(id))
    .filter((profile): profile is T => Boolean(profile))
  const restoredIds = new Set(restored.map(profile => profile.id))

  return [
    ...restored,
    ...profiles.filter(profile => !restoredIds.has(profile.id))
  ]
}
