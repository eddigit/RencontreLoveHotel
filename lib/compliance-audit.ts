import { createHmac } from 'node:crypto'
import { sql } from '@/lib/db'

type AuditMetadata = Record<string, unknown>

export type ComplianceAuditInput = {
  actorUserId?: string | null
  actorRole?: string | null
  action: string
  entityType: string
  entityId?: string | null
  reason?: string | null
  metadata?: AuditMetadata
}

const sensitiveKey = /(password|passphrase|token|secret|content|message|email|phone|address|attachment)/i

function auditSecret() {
  const secret = process.env.LEGAL_AUDIT_HMAC_SECRET?.trim()
  if (!secret) {
    throw new Error('LEGAL_AUDIT_HMAC_SECRET est requis pour le journal Compliance')
  }
  return secret
}

function assertSafeMetadata(value: unknown, path = 'metadata'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeMetadata(item, `${path}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (sensitiveKey.test(key)) {
      throw new Error(`Une métadonnée sensible est interdite dans le journal Compliance (${path}.${key})`)
    }
    assertSafeMetadata(nested, `${path}.${key}`)
  }
}

export function hmacSensitiveValue(value: string) {
  return createHmac('sha256', auditSecret()).update(value).digest('hex')
}

export async function appendComplianceAudit(input: ComplianceAuditInput) {
  const metadata = input.metadata || {}
  assertSafeMetadata(metadata)
  const reason = input.reason?.trim().slice(0, 1000) || null
  const secret = auditSecret()

  const [row] = await sql.query<Array<{ id: string; entry_hash: string }>>(
    `WITH audit_lock AS (
       SELECT pg_advisory_xact_lock(hashtext('lhr-compliance-audit-chain'))
     ), previous_entry AS (
       SELECT entry_hash
       FROM compliance_audit_log, audit_lock
       ORDER BY sequence_id DESC
       LIMIT 1
     ), prepared AS (
       SELECT
         $1::uuid AS actor_user_id,
         $2::text AS actor_role,
         $3::text AS action,
         $4::text AS entity_type,
         $5::text AS entity_id,
         $6::text AS reason,
         $7::jsonb AS metadata,
         (SELECT entry_hash FROM previous_entry) AS previous_hash,
         jsonb_build_object(
           'actorUserId', $1::uuid,
           'actorRole', $2::text,
           'action', $3::text,
           'entityType', $4::text,
           'entityId', $5::text,
           'reason', $6::text,
           'metadata', $7::jsonb,
           'previousHash', (SELECT entry_hash FROM previous_entry)
         ) AS payload
       FROM audit_lock
     )
     INSERT INTO compliance_audit_log (
       actor_user_id, actor_role, action, entity_type, entity_id,
       reason, metadata, previous_hash, entry_hash
     )
     SELECT actor_user_id, actor_role, action, entity_type, entity_id,
            reason, metadata, previous_hash,
            encode(hmac(convert_to(COALESCE(previous_hash, '') || payload::text, 'UTF8'),
                        convert_to($8::text, 'UTF8'), 'sha256'), 'hex')
     FROM prepared
     RETURNING id, entry_hash`,
    [
      input.actorUserId || null,
      input.actorRole || null,
      input.action.slice(0, 120),
      input.entityType.slice(0, 120),
      input.entityId?.slice(0, 200) || null,
      reason,
      JSON.stringify(metadata),
      secret
    ]
  )

  if (!row) throw new Error('Écriture du journal Compliance impossible')
  return { id: row.id, entryHash: row.entry_hash }
}
