'use server'

import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'

export type OwnEmailPreferences = {
  campaignOptIn: boolean
  activityEmailConsent: boolean
  messageEmailEnabled: boolean
  matchEmailEnabled: boolean
  eventEmailEnabled: boolean
}

export type UpdateOwnEmailPreferencesInput = OwnEmailPreferences

const defaults: OwnEmailPreferences = {
  campaignOptIn: false,
  activityEmailConsent: false,
  messageEmailEnabled: false,
  matchEmailEnabled: false,
  eventEmailEnabled: false
}

function normalizePreferences(input: UpdateOwnEmailPreferencesInput): OwnEmailPreferences {
  const activityEmailConsent = input.activityEmailConsent === true
  return {
    campaignOptIn: input.campaignOptIn === true,
    activityEmailConsent,
    messageEmailEnabled: activityEmailConsent && input.messageEmailEnabled === true,
    matchEmailEnabled: activityEmailConsent && input.matchEmailEnabled === true,
    eventEmailEnabled: activityEmailConsent && input.eventEmailEnabled === true
  }
}

function mapRow(row?: Record<string, unknown>): OwnEmailPreferences {
  if (!row) return defaults
  return normalizePreferences({
    campaignOptIn: row.campaign_opt_in === true,
    activityEmailConsent: row.activity_email_consent === true,
    messageEmailEnabled: row.message_email_enabled === true,
    matchEmailEnabled: row.match_email_enabled === true,
    eventEmailEnabled: row.event_email_enabled === true
  })
}

/** Read only the authenticated member's settings; no client supplied user id. */
export async function getOwnEmailPreferences(): Promise<OwnEmailPreferences> {
  const user = await requireCurrentUser()
  const rows = await sql.query<Record<string, unknown>[]>(
    `SELECT campaign_opt_in, activity_email_consent, message_email_enabled,
            match_email_enabled, event_email_enabled
     FROM email_preferences WHERE user_id = $1 LIMIT 1`,
    [user.id]
  )
  return mapRow(rows[0])
}

/**
 * Consent is enforced server-side: disabling it clears every optional
 * member-activity category. Account verification and password-reset emails do
 * not use this preference and remain available when the member requests them.
 */
export async function updateOwnEmailPreferences(
  input: UpdateOwnEmailPreferencesInput
): Promise<OwnEmailPreferences> {
  const user = await requireCurrentUser()
  const preference = normalizePreferences(input)
  const rows = await sql.query<Record<string, unknown>[]>(
    `INSERT INTO email_preferences (
       user_id, campaign_opt_in, campaign_opt_in_at, opted_out_at,
       activity_email_consent, activity_email_decided_at, activity_email_source,
       message_email_enabled, match_email_enabled, event_email_enabled, updated_at
     ) VALUES (
       $1, $2,
       CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
       CASE WHEN $2 THEN NULL ELSE CURRENT_TIMESTAMP END,
       $3, CURRENT_TIMESTAMP, 'member_settings', $4, $5, $6, CURRENT_TIMESTAMP
     )
     ON CONFLICT (user_id) DO UPDATE SET
       campaign_opt_in = EXCLUDED.campaign_opt_in,
       campaign_opt_in_at = CASE WHEN EXCLUDED.campaign_opt_in
         THEN COALESCE(email_preferences.campaign_opt_in_at, CURRENT_TIMESTAMP) ELSE NULL END,
       opted_out_at = CASE WHEN EXCLUDED.campaign_opt_in THEN NULL ELSE CURRENT_TIMESTAMP END,
       activity_email_consent = EXCLUDED.activity_email_consent,
       activity_email_decided_at = CURRENT_TIMESTAMP,
       activity_email_source = 'member_settings',
       message_email_enabled = EXCLUDED.message_email_enabled,
       match_email_enabled = EXCLUDED.match_email_enabled,
       event_email_enabled = EXCLUDED.event_email_enabled,
       updated_at = CURRENT_TIMESTAMP
     RETURNING campaign_opt_in, activity_email_consent, message_email_enabled,
               match_email_enabled, event_email_enabled`,
    [
      user.id,
      preference.campaignOptIn,
      preference.activityEmailConsent,
      preference.messageEmailEnabled,
      preference.matchEmailEnabled,
      preference.eventEmailEnabled
    ]
  )
  return mapRow(rows[0])
}
