import { sql } from '@/lib/db'
import { ONLINE_USER_WINDOW_MINUTES } from '@/lib/presence-config'

let presenceSchemaReady: boolean | null = null

export async function ensurePresenceSchema() {
  if (presenceSchemaReady !== null) return presenceSchemaReady

  try {
    const result = await sql.query<Array<{ present: boolean }>>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_seen_at'
      ) AS present`,
      []
    )
    presenceSchemaReady = Boolean(result[0]?.present)
  } catch (error) {
    console.error('Unable to inspect user presence schema:', error)
    presenceSchemaReady = false
  }

  return presenceSchemaReady
}

export function onlinePresenceCondition(column = 'u.last_seen_at') {
  return `(${column} IS NOT NULL AND ${column} >= NOW() - INTERVAL '${ONLINE_USER_WINDOW_MINUTES} minutes')`
}

export async function markUserSeen(userId: string) {
  const hasPresenceColumn = await ensurePresenceSchema()

  if (hasPresenceColumn) {
    await sql.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [
      userId
    ])
    await recordPresenceDay(userId)
    return
  }

  await sql.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
    userId
  ])
  await recordPresenceDay(userId)
}

// Keep a single observation per member per Paris calendar day.
let dailySchema: Promise<unknown> | undefined
async function recordPresenceDay(userId: string) {
  try {
    dailySchema ??= sql.query<Array<{ present: boolean }>>("SELECT to_regclass('public.member_presence_days') IS NOT NULL AS present")
      .then(rows => rows[0]?.present || sql.query(`CREATE TABLE IF NOT EXISTS member_presence_days (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      active_day DATE NOT NULL,
      PRIMARY KEY (active_day, user_id)
    )`)).catch(error => { dailySchema = undefined; throw error })
    await dailySchema
    await sql.query(`INSERT INTO member_presence_days (user_id, active_day)
      VALUES ($1, timezone('Europe/Paris', NOW())::date)
      ON CONFLICT (active_day, user_id) DO NOTHING`, [userId])
  } catch {
    console.warn('Historique quotidien de présence indisponible')
  }
}

export function isUserRecentlySeen(lastSeenAt?: string | Date | null) {
  if (!lastSeenAt) return false

  const timestamp =
    lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime()

  if (Number.isNaN(timestamp)) return false

  return Date.now() - timestamp <= ONLINE_USER_WINDOW_MINUTES * 60 * 1000
}
