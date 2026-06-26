const { Pool } = require('pg')

const tables = [
  'users',
  'user_profiles',
  'user_preferences',
  'user_meeting_types',
  'user_additional_options',
  'user_matches',
  'conversations',
  'conversation_participants',
  'messages',
  'photos',
  'events',
  'event_participants',
  'conciergerie_requests',
  'notifications'
]

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
})

async function main() {
  for (const table of tables) {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`)
    console.log(`${table}=${result.rows[0].count}`)
  }
}

main()
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
