import { sql } from '@/lib/db'

let schemaPromise: Promise<void> | undefined

/**
 * Keeps the admin directory available while an additive migration rolls out.
 * A NULL timestamp means that the member is not currently starred.
 */
export function ensureAdminUserStarSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const columns = await sql.query<Array<{ present: boolean }>>(
        `SELECT COUNT(*) = 2 AS present FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name IN ('admin_starred_at','moderator_spotlight_at')`,
        []
      )

      if (!columns[0]?.present) {
        await sql.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_starred_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS moderator_spotlight_at TIMESTAMPTZ', [])
      }
    })().catch(error => {
      schemaPromise = undefined
      throw error
    })
  }

  return schemaPromise
}
