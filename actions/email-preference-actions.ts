'use server'

import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'

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
