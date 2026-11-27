/** Formats a member pseudonym for display without changing persisted data. */
export function displayMemberName (value: string | null | undefined, fallback = 'Membre') {
  const name = value?.trim()
  if (!name) return fallback

  const firstLetter = name.match(/\p{L}/u)
  if (!firstLetter?.[0]) return name

  const index = firstLetter.index ?? 0
  const first = firstLetter[0]
  return `${name.slice(0, index)}${first.toLocaleUpperCase('fr-FR')}${name.slice(index + first.length).toLocaleLowerCase('fr-FR')}`
}
