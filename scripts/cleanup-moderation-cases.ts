import { sql } from '@/lib/db'
import { buildModerationCleanupQuery } from '@/lib/moderation-retention'

async function main () {
  const execute = process.argv.includes('--execute')
  const rows = await sql.query<Array<{ id: string }>>(buildModerationCleanupQuery(execute), [])
  console.log(JSON.stringify({
    mode: execute ? 'execute' : 'dry-run',
    eligibleCaseCount: rows.length
  }))
}

main().catch(error => {
  console.error(JSON.stringify({
    status: 'error',
    errorName: error instanceof Error ? error.name : 'UnknownError'
  }))
  process.exitCode = 1
})
