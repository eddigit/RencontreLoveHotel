import { sql } from '@/lib/db'

let schemaPromise: Promise<void> | undefined
export function ensureProfileLikesDislikesSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    await sql.query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS likes TEXT', [])
    await sql.query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dislikes TEXT', [])
  })().catch(error => { schemaPromise = undefined; throw error })
  return schemaPromise
}

export function normalizeProfileTags(value: unknown) {
  const list = Array.isArray(value) ? value : []
  return [...new Set(list.map(item => String(item).trim().replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 12).map(item => item.slice(0, 60))
}

export function parseProfileTags(value: unknown) {
  if (Array.isArray(value)) return normalizeProfileTags(value)
  if (typeof value !== 'string') return []
  try { return normalizeProfileTags(JSON.parse(value)) } catch { return [] }
}
