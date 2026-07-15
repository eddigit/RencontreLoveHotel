export const LEGAL_POLICY_VERSIONS = {
  terms: '2026-07-15',
  privacy: '2026-07-15',
  antiSolicitation: '2026-07-15'
} as const

export type RegistrationConsent = {
  adult: boolean
  terms: boolean
  antiSolicitation: boolean
  versions: {
    terms: string
    privacy: string
    antiSolicitation: string
  }
}

export function isCurrentRegistrationConsent(
  consent: RegistrationConsent | null | undefined
): consent is RegistrationConsent {
  return Boolean(
    consent?.adult &&
    consent.terms &&
    consent.antiSolicitation &&
    consent.versions?.terms === LEGAL_POLICY_VERSIONS.terms &&
    consent.versions?.privacy === LEGAL_POLICY_VERSIONS.privacy &&
    consent.versions?.antiSolicitation === LEGAL_POLICY_VERSIONS.antiSolicitation
  )
}
