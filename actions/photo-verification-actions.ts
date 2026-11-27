'use server'

import { sql } from '@/lib/db'
import { requireAdmin, requireCurrentUser } from '@/lib/server-auth'
import { ensurePrivatePhotoVerificationSchema, PHOTO_VERIFICATION_ID, purgeExpiredPrivatePhotoVerifications, type PhotoVerificationDecision, type PhotoVerificationRequest } from '@/lib/private-photo-verification'
import { verifiedPhotoPredicateSql } from '@/lib/photo-verification-badge'

type RequestRow = { id: string; user_id: string; identity_kind: 'solo' | 'couple'; pseudonym_snapshot: string; status: PhotoVerificationRequest['status']; submitted_at: string; expires_at: string; decided_at: string | null; decision_note: string | null; evidence_available: boolean }
const toRequest = (row: RequestRow): PhotoVerificationRequest => ({ id: row.id, userId: row.user_id, identityKind: row.identity_kind, pseudonymSnapshot: row.pseudonym_snapshot, status: row.status, submittedAt: row.submitted_at, expiresAt: row.expires_at, decidedAt: row.decided_at, decisionNote: row.decision_note, evidenceAvailable: row.evidence_available })
async function prepare() { await ensurePrivatePhotoVerificationSchema(); await purgeExpiredPrivatePhotoVerifications() }

export async function getOwnPhotoVerificationRequest(): Promise<PhotoVerificationRequest | null> {
  const user = await requireCurrentUser(); await prepare()
  const rows = await sql.query<RequestRow[]>(`SELECT id, user_id, identity_kind, pseudonym_snapshot, status, submitted_at, expires_at, decided_at, decision_note, evidence_image IS NOT NULL AS evidence_available FROM private_photo_verification_requests WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`, [user.id])
  return rows[0] ? toRequest(rows[0]) : null
}

export async function withdrawPhotoVerificationRequest() {
  const user = await requireCurrentUser(); await prepare()
  const rows = await sql.query<{ id: string }[]>(`UPDATE private_photo_verification_requests SET status = 'removed', evidence_image = NULL, evidence_mime_type = NULL, evidence_bytes = NULL, decided_at = CURRENT_TIMESTAMP, evidence_purged_at = COALESCE(evidence_purged_at, CURRENT_TIMESTAMP) WHERE user_id = $1 AND status IN ('pending', 'approved') RETURNING id`, [user.id])
  return { removed: Boolean(rows[0]) }
}

export async function getAdminPhotoVerificationRequests(): Promise<PhotoVerificationRequest[]> {
  await requireAdmin(); await prepare()
  const rows = await sql.query<RequestRow[]>(`SELECT id, user_id, identity_kind, pseudonym_snapshot, status, submitted_at, expires_at, decided_at, decision_note, evidence_image IS NOT NULL AS evidence_available FROM private_photo_verification_requests ORDER BY (status = 'pending') DESC, submitted_at ASC`, [])
  return rows.map(toRequest)
}

export async function reviewPhotoVerificationRequest(id: string, input: { decision: PhotoVerificationDecision; note?: string }) {
  const admin = await requireAdmin()
  if (!PHOTO_VERIFICATION_ID.test(id) || !['approve', 'reject', 'remove'].includes(input.decision)) throw new Error('Décision invalide')
  await prepare()
  const status = input.decision === 'approve' ? 'approved' : input.decision === 'reject' ? 'rejected' : 'removed'
  const rows = await sql.query<RequestRow[]>(`UPDATE private_photo_verification_requests SET status = $2, evidence_image = NULL, evidence_mime_type = NULL, evidence_bytes = NULL, decided_at = CURRENT_TIMESTAMP, decided_by = $3, decision_note = $4, evidence_purged_at = COALESCE(evidence_purged_at, CURRENT_TIMESTAMP) WHERE id = $1 AND (status = 'pending' OR ($2 = 'removed' AND status = 'approved')) RETURNING id, user_id, identity_kind, pseudonym_snapshot, status, submitted_at, expires_at, decided_at, decision_note, FALSE AS evidence_available`, [id, status, admin.id, input.note?.trim().slice(0, 1000) || null])
  if (!rows[0]) throw new Error('Demande introuvable ou déjà traitée')
  return toRequest(rows[0])
}

/** Public badge source: approved request + active, non-banned, displayed profile. */
export async function getPublicProfileVerified(userId: string) {
  if (!PHOTO_VERIFICATION_ID.test(userId)) return false
  await ensurePrivatePhotoVerificationSchema()
  const rows = await sql.query<{ verified: boolean }[]>(`SELECT EXISTS (SELECT 1 FROM users u JOIN user_profiles up ON up.user_id = u.id WHERE u.id = $1 AND ${verifiedPhotoPredicateSql()}) AS verified`, [userId])
  return Boolean(rows[0]?.verified)
}
