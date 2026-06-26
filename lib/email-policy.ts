export type EmailPurpose =
  | 'password_reset'
  | 'campaign'
  | 'event'
  | 'community'
  | 'security'
  | 'verification'
  | 'other'

export type EmailPolicyReason =
  | 'password_reset_requested'
  | 'password_reset_not_requested'
  | 'campaign_opted_in'
  | 'missing_campaign_opt_in'
  | 'opted_out'
  | 'suppressed'
  | 'banned_or_inactive'
  | 'purpose_blocked_by_default'

export type EmailPolicyInput = {
  purpose: EmailPurpose | string
  requestedByUser: boolean
  user?: {
    status?: string | null
    isBanned?: boolean | null
  } | null
  preference?: {
    campaignOptIn?: boolean | null
    optedOutAt?: string | Date | null
  } | null
  suppressed?: boolean | null
}

export type EmailPolicyResult = {
  allowed: boolean
  reason: EmailPolicyReason
}

export function normalizeEmailPurpose(value: string): EmailPurpose {
  if (value === 'password_reset') return 'password_reset'
  if (value === 'campaign') return 'campaign'
  if (value === 'event') return 'event'
  if (value === 'community') return 'community'
  if (value === 'security') return 'security'
  if (value === 'verification') return 'verification'
  return 'other'
}

export function canSendEmailForPurpose(
  input: EmailPolicyInput
): EmailPolicyResult {
  const purpose = normalizeEmailPurpose(String(input.purpose))

  if (purpose === 'password_reset') {
    return input.requestedByUser
      ? { allowed: true, reason: 'password_reset_requested' }
      : { allowed: false, reason: 'password_reset_not_requested' }
  }

  const userIsBlocked =
    input.user?.isBanned === true ||
    (input.user?.status && input.user.status !== 'active')

  if (userIsBlocked) {
    return { allowed: false, reason: 'banned_or_inactive' }
  }

  if (input.suppressed) {
    return { allowed: false, reason: 'suppressed' }
  }

  if (input.preference?.optedOutAt) {
    return { allowed: false, reason: 'opted_out' }
  }

  if (purpose === 'campaign') {
    return input.preference?.campaignOptIn === true
      ? { allowed: true, reason: 'campaign_opted_in' }
      : { allowed: false, reason: 'missing_campaign_opt_in' }
  }

  return { allowed: false, reason: 'purpose_blocked_by_default' }
}
