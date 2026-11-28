export const MINIMUM_MEMBER_AGE = 18
const MAXIMUM_MEMBER_AGE = 110

export const MINOR_AGE_MESSAGE = 'Joug est réservé aux personnes majeures : la date de naissance doit correspondre à au moins 18 ans.'
export const INVALID_BIRTHDAY_MESSAGE = 'Indiquez une date de naissance valide.'
export const AGE_MISMATCH_MESSAGE = 'L’âge choisi ne correspond pas à la date de naissance.'

export class MemberAgeError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'MemberAgeError'
  }
}

/** Full years between a YYYY-MM-DD birthday and today; null when the date is not a real past date. */
export function ageFromBirthday (birthday: unknown, today: Date = new Date()): number | null {
  if (typeof birthday !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday.trim())
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null

  let age = today.getUTCFullYear() - year
  const beforeBirthday = today.getUTCMonth() + 1 < month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)
  if (beforeBirthday) age -= 1
  return age >= 0 && age <= MAXIMUM_MEMBER_AGE ? age : null
}

/**
 * The age a member may be stored with. The birthday is the reference: a minor
 * or impossible date is refused, and a declared age that contradicts it too.
 */
export function requireAdultAge (
  input: { birthday: unknown, declaredAge?: unknown, birthdayRequired?: boolean },
  today: Date = new Date()
): number | null {
  const declared = Number(input.declaredAge)
  const hasDeclared = Number.isFinite(declared) && declared > 0
  const hasBirthday = typeof input.birthday === 'string' && input.birthday.trim() !== ''

  if (!hasBirthday) {
    if (input.birthdayRequired) throw new MemberAgeError(INVALID_BIRTHDAY_MESSAGE)
    if (hasDeclared && declared < MINIMUM_MEMBER_AGE) throw new MemberAgeError(MINOR_AGE_MESSAGE)
    return hasDeclared ? declared : null
  }

  const age = ageFromBirthday(input.birthday, today)
  if (age === null) throw new MemberAgeError(INVALID_BIRTHDAY_MESSAGE)
  if (age < MINIMUM_MEMBER_AGE) throw new MemberAgeError(MINOR_AGE_MESSAGE)
  if (hasDeclared && declared !== age) throw new MemberAgeError(AGE_MISMATCH_MESSAGE)
  return age
}

/** Latest birthday (YYYY-MM-DD) an adult can have today, for the date picker. */
export function latestAdultBirthday (today: Date = new Date()): string {
  const limit = new Date(Date.UTC(today.getUTCFullYear() - MINIMUM_MEMBER_AGE, today.getUTCMonth(), today.getUTCDate()))
  return limit.toISOString().slice(0, 10)
}
