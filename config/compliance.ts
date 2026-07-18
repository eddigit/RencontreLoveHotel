export type ComplianceEnvironment = Record<string, string | undefined>

export type ComplianceFlags = {
  legalCenter: boolean
  versionedAcceptance: boolean
  sensitiveConsent: boolean
  newReporting: boolean
  moderationAppeals: boolean
  coupleAccounts: boolean
  openCurtainConsent: boolean
  paymentHardening: boolean
  contactSafety: boolean
  scopedConversationAccess: boolean
}

const enabled = (value: string | undefined) => value === 'true'

export function getComplianceFlags(
  env: ComplianceEnvironment = process.env
): ComplianceFlags {
  return {
    legalCenter: enabled(env.COMPLIANCE_LEGAL_CENTER_ENABLED),
    versionedAcceptance: enabled(env.COMPLIANCE_VERSIONED_ACCEPTANCE_ENABLED),
    sensitiveConsent: enabled(env.COMPLIANCE_SENSITIVE_CONSENT_ENABLED),
    newReporting: enabled(env.COMPLIANCE_NEW_REPORTING_ENABLED),
    moderationAppeals: enabled(env.COMPLIANCE_MODERATION_APPEALS_ENABLED),
    coupleAccounts: enabled(env.COMPLIANCE_COUPLE_ACCOUNTS_ENABLED),
    openCurtainConsent: enabled(env.COMPLIANCE_OPEN_CURTAIN_CONSENT_ENABLED),
    paymentHardening: enabled(env.COMPLIANCE_PAYMENT_HARDENING_ENABLED),
    contactSafety: enabled(env.COMPLIANCE_CONTACT_SAFETY_ENABLED),
    scopedConversationAccess: enabled(env.COMPLIANCE_SCOPED_CONVERSATION_ACCESS_ENABLED)
  }
}
