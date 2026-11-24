import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sql } from '@/lib/db'

let ready: Promise<void> | undefined

async function checkFeedbackSchema() {
  const [row] = await sql.query<Array<{ ready: boolean }>>(
    "SELECT to_regclass('idx_community_feedback_source_notification_unique') IS NOT NULL AS ready"
  )
  if (!row?.ready) {
    const migration = await readFile(join(process.cwd(), 'migrations', '20261124_community_feedback_canonical.sql'), 'utf8')
    await sql.query(migration)
  }
}

export function ensureFeedbackSchema() {
  if (!ready) {
    ready = checkFeedbackSchema().catch(error => {
      ready = undefined
      throw error
    })
  }
  return ready
}
