'use server'

import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'

export type ActivityEmailPreferences = {
  consent: boolean
  decisionRequired: boolean
  messages: boolean
  matches: boolean
  events: boolean
}

export type ActivityEmailPreferenceInput = {
  consent: boolean
  messages: boolean
  matches: boolean
  events: boolean
  source?: 'registration' | 'login_prompt' | 'member_preferences'
}

type ActivityEmailPreferenceRow = {
  activity_email_consent: boolean
  activity_email_decided_at: Date | string | null
  message_email_enabled: boolean
  match_email_enabled: boolean
  event_email_enabled: boolean
}

const DEFAULT_ACTIVITY_PREFERENCE: ActivityEmailPreferences = {
  consent: false,
  decisionRequired: true,
  messages: false,
  matches: false,
  events: false
}

function mapActivityPreference(
  row?: ActivityEmailPreferenceRow
): ActivityEmailPreferences {
  if (!row) return DEFAULT_ACTIVITY_PREFERENCE

  const consent = row.activity_email_consent === true
  return {
    consent,
    decisionRequired: !row.activity_email_decided_at,
    messages: consent && row.message_email_enabled === true,
    matches: consent && row.match_email_enabled === true,
    events: consent && row.event_email_enabled === true
  }
}

export async function getCampaignEmailPreference() {
  const user = await requireCurrentUser()
  const rows = await sql.query<Array<{ campaign_opt_in: boolean; opted_out_at?: Date | null }>>(
    `SELECT campaign_opt_in, opted_out_at FROM email_preferences WHERE user_id = $1 LIMIT 1`,
    [user.id]
  )
  return rows[0] || { campaign_opt_in: false, opted_out_at: null }
}

export async function updateCampaignEmailPreference(optIn: boolean) {
  const user = await requireCurrentUser()
  await sql.query(
    `
      INSERT INTO email_preferences (
        user_id, campaign_opt_in, campaign_opt_in_at, opted_out_at, source, updated_at
      ) VALUES (
        $1, $2, CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
        CASE WHEN $2 THEN NULL ELSE CURRENT_TIMESTAMP END,
        'member_preferences', CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) DO UPDATE SET
        campaign_opt_in = EXCLUDED.campaign_opt_in,
        campaign_opt_in_at = CASE
          WHEN EXCLUDED.campaign_opt_in THEN COALESCE(email_preferences.campaign_opt_in_at, CURRENT_TIMESTAMP)
          ELSE NULL
        END,
        opted_out_at = CASE WHEN EXCLUDED.campaign_opt_in THEN NULL ELSE CURRENT_TIMESTAMP END,
        source = 'member_preferences',
        updated_at = CURRENT_TIMESTAMP
    `,
    [user.id, optIn]
  )
  return { campaignOptIn: optIn }
}

export async function getActivityEmailPreference(): Promise<ActivityEmailPreferences> {
  const user = await requireCurrentUser()
  const rows = await sql.query<ActivityEmailPreferenceRow[]>(
    `SELECT
       activity_email_consent,
       activity_email_decided_at,
       message_email_enabled,
       match_email_enabled,
       event_email_enabled
     FROM email_preferences
     WHERE user_id = $1
     LIMIT 1`,
    [user.id]
  )

  return mapActivityPreference(rows[0])
}

export async function updateActivityEmailPreference(
  input: ActivityEmailPreferenceInput
): Promise<ActivityEmailPreferences> {
  const user = await requireCurrentUser()
  const consent = input.consent === true
  const messages = consent && input.messages === true
  const matches = consent && input.matches === true
  const events = consent && input.events === true
  const source = input.source || 'member_preferences'

  await sql.query(
    `INSERT INTO email_preferences (
       user_id,
       activity_email_consent,
       activity_email_decided_at,
       message_email_enabled,
       match_email_enabled,
       event_email_enabled,
       activity_email_source,
       source,
       updated_at
     ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       activity_email_consent = EXCLUDED.activity_email_consent,
       activity_email_decided_at = CURRENT_TIMESTAMP,
       message_email_enabled = EXCLUDED.message_email_enabled,
       match_email_enabled = EXCLUDED.match_email_enabled,
       event_email_enabled = EXCLUDED.event_email_enabled,
       activity_email_source = EXCLUDED.activity_email_source,
       source = EXCLUDED.source,
       updated_at = CURRENT_TIMESTAMP`,
    [user.id, consent, messages, matches, events, source]
  )

  return {
    consent,
    decisionRequired: false,
    messages,
    matches,
    events
  }
}
