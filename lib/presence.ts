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
    return
  }

  await sql.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
    userId
  ])
}

export function isUserRecentlySeen(lastSeenAt?: string | Date | null) {
  if (!lastSeenAt) return false

  const timestamp =
    lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime()

  if (Number.isNaN(timestamp)) return false

  return Date.now() - timestamp <= ONLINE_USER_WINDOW_MINUTES * 60 * 1000
}
