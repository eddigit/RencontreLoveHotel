export const ADULT_CONSENT_VERSION = '2026-07-13'

const MINIMUM_BIRTH_DATE = '1900-01-01'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function dateParts (value: string) {
  if (!DATE_PATTERN.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

export function currentDateInParis (now = new Date()) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function adultBirthDateLimit (referenceDate = currentDateInParis()) {
  const reference = dateParts(referenceDate)
  if (!reference) throw new Error('Date de référence invalide.')

  const targetYear = reference.year - 18
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, reference.month, 0)
  ).getUTCDate()
  const targetDay = Math.min(reference.day, lastDayOfTargetMonth)

  return `${String(targetYear).padStart(4, '0')}-${String(reference.month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

export function validateAdultDateOfBirth (
  value: string,
  referenceDate = currentDateInParis()
):
  | { ok: true; age: number; dateOfBirth: string }
  | { ok: false; error: string } {
  const dateOfBirth = value.trim()
  const birth = dateParts(dateOfBirth)
  const reference = dateParts(referenceDate)

  if (!birth || !reference || dateOfBirth < MINIMUM_BIRTH_DATE || dateOfBirth > referenceDate) {
    return { ok: false, error: 'Date de naissance invalide.' }
  }

  if (dateOfBirth > adultBirthDateLimit(referenceDate)) {
    return {
      ok: false,
      error: 'L’accès est strictement réservé aux personnes majeures.'
    }
  }

  let age = reference.year - birth.year
  if (
    reference.month < birth.month ||
    (reference.month === birth.month && reference.day < birth.day)
  ) {
    age -= 1
  }

  return { ok: true, age, dateOfBirth }
}
