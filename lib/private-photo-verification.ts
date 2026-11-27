import 'server-only'
import sharp from 'sharp'
import { ensurePrivatePhotoVerificationSchema } from '@/lib/photo-verification-schema'
import { sql } from '@/lib/db'

export const PRIVATE_PHOTO_MAX_BYTES = 2 * 1024 * 1024
const PRIVATE_PHOTO_MAX_INPUT_BYTES = 3 * 1024 * 1024
export const PHOTO_VERIFICATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export type PhotoVerificationStatus = 'pending' | 'approved' | 'rejected' | 'removed' | 'expired'
export type PhotoVerificationIdentityKind = 'solo' | 'couple'
export type PhotoVerificationDecision = 'approve' | 'reject' | 'remove'
export type PhotoVerificationRequest = { id: string; userId: string; identityKind: PhotoVerificationIdentityKind; pseudonymSnapshot: string; status: PhotoVerificationStatus; submittedAt: string; expiresAt: string; decidedAt: string | null; decisionNote: string | null; evidenceAvailable: boolean }

export { ensurePrivatePhotoVerificationSchema } from '@/lib/photo-verification-schema'

export async function recodePrivateVerificationImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size <= 0 || file.size > PRIVATE_PHOTO_MAX_INPUT_BYTES) throw new Error('Image de vérification invalide')
  try {
    const output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000, failOn: 'error' }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85, effort: 4 }).toBuffer()
    if (!output.length || output.length > PRIVATE_PHOTO_MAX_BYTES) throw new Error('Image recodée trop volumineuse')
    return output
  } catch { throw new Error('Image de vérification illisible') }
}

export async function purgeExpiredPrivatePhotoVerifications() {
  await ensurePrivatePhotoVerificationSchema()
  await sql.query(`UPDATE private_photo_verification_requests SET status = 'expired', evidence_image = NULL, evidence_mime_type = NULL, evidence_bytes = NULL, decided_at = CURRENT_TIMESTAMP, evidence_purged_at = CURRENT_TIMESTAMP WHERE status = 'pending' AND expires_at <= CURRENT_TIMESTAMP`, [])
}

export async function submitPrivatePhotoVerification(userId: string, file: File) {
  if (!PHOTO_VERIFICATION_ID.test(userId)) throw new Error('Membre invalide')
  const image = await recodePrivateVerificationImage(file)
  await ensurePrivatePhotoVerificationSchema(); await purgeExpiredPrivatePhotoVerifications()
  const rows = await sql.query<Array<{ id: string }>>(`INSERT INTO private_photo_verification_requests (user_id, identity_kind, pseudonym_snapshot, evidence_image, evidence_mime_type, evidence_bytes)
    SELECT u.id,
      CASE WHEN LOWER(COALESCE(up.status, '')) LIKE 'couple%' OR LOWER(COALESCE(up.gender, '')) LIKE 'couple%' THEN 'couple'
           WHEN LOWER(COALESCE(up.status, '')) LIKE 'single_%' OR LOWER(COALESCE(up.gender, '')) IN ('female','male','trans','woman','man') THEN 'solo' END,
      NULLIF(TRIM(u.name), ''), $2, 'image/webp', $3
    FROM users u JOIN LATERAL (SELECT status, gender FROM user_profiles WHERE user_id = u.id ORDER BY updated_at DESC NULLS LAST LIMIT 1) up ON TRUE
    WHERE u.id = $1 AND COALESCE(u.is_banned, false) = false AND COALESCE(u.status, 'active') = 'active'
      AND NULLIF(TRIM(u.name), '') IS NOT NULL
      AND (LOWER(COALESCE(up.status, '')) LIKE 'couple%' OR LOWER(COALESCE(up.gender, '')) LIKE 'couple%' OR LOWER(COALESCE(up.status, '')) LIKE 'single_%' OR LOWER(COALESCE(up.gender, '')) IN ('female','male','trans','woman','man'))
    ON CONFLICT DO NOTHING RETURNING id`, [userId, image, image.length])
  if (!rows[0]) throw new Error('Profil non éligible ou vérification déjà active')
  return rows[0].id
}

export async function readPrivatePhotoVerificationEvidence(id: string) {
  if (!PHOTO_VERIFICATION_ID.test(id)) return null
  await ensurePrivatePhotoVerificationSchema(); await purgeExpiredPrivatePhotoVerifications()
  const rows = await sql.query<Array<{ evidence_image: Buffer; evidence_mime_type: string }>>(`SELECT evidence_image, evidence_mime_type FROM private_photo_verification_requests WHERE id = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP AND evidence_image IS NOT NULL AND evidence_mime_type = 'image/webp'`, [id])
  return rows[0] ? { image: rows[0].evidence_image, mimeType: rows[0].evidence_mime_type } : null
}
