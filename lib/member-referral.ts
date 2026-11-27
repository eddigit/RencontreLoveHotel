import { randomUUID } from 'node:crypto'
import { executeQuery } from '@/lib/db'
import { signPayload, verifySignedPayload } from '@/lib/signed-payload'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000
let schemaPromise: Promise<void> | undefined

export function ensureReferralSchema() {
  if (!schemaPromise) schemaPromise = executeQuery(`
    CREATE TABLE IF NOT EXISTS member_referral_codes (
      referrer_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      code UUID NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS member_referrals (
      referee_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT member_referrals_distinct_members CHECK (referee_id <> referrer_id)
    );
    CREATE INDEX IF NOT EXISTS idx_member_referrals_referrer_created ON member_referrals (referrer_id, created_at DESC);
  `).then(() => undefined).catch(error => { schemaPromise = undefined; throw error })
  return schemaPromise
}

export async function referralTokenForMember(memberId: string, secret: string) {
  if (!UUID.test(memberId) || !secret) throw new Error('Parrainage indisponible.')
  await ensureReferralSchema()
  const rows = await executeQuery<Array<{ code: string }>>(
    `INSERT INTO member_referral_codes (referrer_id, code)
     SELECT id, $2::uuid FROM users
     WHERE id = $1 AND NOT COALESCE(is_banned, FALSE) AND COALESCE(status, 'active') = 'active'
     ON CONFLICT (referrer_id) DO UPDATE SET referrer_id = EXCLUDED.referrer_id
     RETURNING code`,
    [memberId, randomUUID()]
  )
  if (!rows[0]?.code) throw new Error('Parrainage indisponible.')
  return createMemberReferralToken(rows[0].code, secret)
}

export function referralCodeFromToken(token: string | null | undefined, secret: string) {
  if (typeof token !== 'string' || token.length > 1024 || !secret) return null
  const payload = verifySignedPayload<{ purpose: string, code: string, expiresAt: number }>(token, secret)
  return payload?.purpose === 'member-referral' && payload.expiresAt >= Date.now() && UUID.test(payload.code) ? payload.code : null
}

export function createMemberReferralToken(code: string, secret: string, now = Date.now()) {
  if (!UUID.test(code)) throw new Error('Code de parrainage invalide.')
  return signPayload({ purpose: 'member-referral', code, expiresAt: now + TOKEN_TTL_MS }, secret)
}

/** Best effort only: free registration succeeds even if this optional write is unavailable. */
export async function recordMemberReferral(refereeId: string, token: string | null | undefined) {
  const code = referralCodeFromToken(token, process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '')
  if (!code || !UUID.test(refereeId)) return false
  try {
    await ensureReferralSchema()
    const rows = await executeQuery<Array<{ referee_id: string }>>(
      `INSERT INTO member_referrals (referee_id, referrer_id)
       SELECT $1, c.referrer_id FROM member_referral_codes c JOIN users u ON u.id = c.referrer_id
       WHERE c.code = $2::uuid AND c.referrer_id <> $1
         AND NOT COALESCE(u.is_banned, FALSE) AND COALESCE(u.status, 'active') = 'active'
       ON CONFLICT (referee_id) DO NOTHING RETURNING referee_id`, [refereeId, code]
    )
    return rows.length === 1
  } catch { return false }
}
