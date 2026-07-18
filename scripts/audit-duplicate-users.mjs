import { createHash } from 'crypto'
import { config } from 'dotenv'
import pg from 'pg'

config()

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!databaseUrl) throw new Error('DATABASE_URL est requise')

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false
})

const client = await pool.connect()
try {
  await client.query('BEGIN TRANSACTION READ ONLY')
  const { rows } = await client.query(`
    WITH duplicate_emails AS (
      SELECT lower(email) AS email_key
      FROM users
      GROUP BY lower(email)
      HAVING count(*) > 1
    )
    SELECT
      lower(u.email) AS email_key,
      u.id,
      u.role,
      u.created_at,
      (u.password_hash IS NOT NULL) AS has_password,
      u.onboarding_completed,
      (u.avatar IS NOT NULL AND u.avatar <> '') AS has_avatar,
      EXISTS(SELECT 1 FROM user_profiles p WHERE p.user_id = u.id) AS has_profile,
      (SELECT count(*)::int FROM photos p WHERE p.user_id = u.id) AS photo_count,
      (SELECT count(*)::int FROM conversation_participants cp WHERE cp.user_id = u.id) AS conversation_count,
      (SELECT count(*)::int FROM messages m WHERE m.sender_id = u.id) AS message_count,
      (SELECT count(*)::int FROM user_matches um WHERE um.user_id_1 = u.id OR um.user_id_2 = u.id) AS match_count,
      (SELECT count(*)::int FROM events e WHERE e.creator_id = u.id) AS event_count
    FROM users u
    JOIN duplicate_emails d ON d.email_key = lower(u.email)
    ORDER BY lower(u.email), u.created_at, u.id
  `)

  const groups = new Map()
  for (const row of rows) {
    const group = groups.get(row.email_key) || []
    group.push(row)
    groups.set(row.email_key, group)
  }

  const score = account =>
    (account.role === 'admin' ? 100_000 : 0) +
    (account.has_password ? 1_000 : 0) +
    (account.onboarding_completed ? 500 : 0) +
    (account.has_profile ? 300 : 0) +
    (account.has_avatar ? 150 : 0) +
    Math.min(account.photo_count, 20) * 50 +
    Math.min(account.conversation_count, 100) * 25 +
    Math.min(account.message_count, 500) * 10 +
    Math.min(account.match_count, 1_000) * 2 +
    Math.min(account.event_count, 100) * 20

  const reportGroups = [...groups.entries()].map(([emailKey, accounts]) => {
    const ranked = [...accounts].sort((left, right) =>
      score(right) - score(left) ||
      new Date(left.created_at) - new Date(right.created_at) ||
      left.id.localeCompare(right.id)
    )
    return {
      groupKey: createHash('sha256').update(emailKey).digest('hex').slice(0, 12),
      primaryUserId: ranked[0].id,
      accounts: ranked.map(account => ({
        id: account.id,
        score: score(account),
        role: account.role,
        createdAt: account.created_at,
        hasPassword: account.has_password,
        onboardingCompleted: account.onboarding_completed,
        hasProfile: account.has_profile,
        hasAvatar: account.has_avatar,
        photos: account.photo_count,
        conversations: account.conversation_count,
        messages: account.message_count,
        matches: account.match_count,
        events: account.event_count
      }))
    }
  })

  const totals = reportGroups.flatMap(group => group.accounts).reduce(
    (result, account) => ({
      accounts: result.accounts + 1,
      photos: result.photos + account.photos,
      conversations: result.conversations + account.conversations,
      messages: result.messages + account.messages,
      matches: result.matches + account.matches,
      events: result.events + account.events
    }),
    { accounts: 0, photos: 0, conversations: 0, messages: 0, matches: 0, events: 0 }
  )

  process.stdout.write(`${JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    duplicateGroups: reportGroups.length,
    totals,
    groups: reportGroups
  }, null, 2)}\n`)
  await client.query('ROLLBACK')
} finally {
  client.release()
  await pool.end()
}
