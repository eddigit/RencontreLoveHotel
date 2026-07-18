import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db', () => ({ sql: { query } }))

import {
  appendComplianceAudit,
  hmacSensitiveValue
} from '@/lib/compliance-audit'

describe('compliance HMAC audit', () => {
  beforeEach(() => {
    query.mockReset()
    process.env.LEGAL_AUDIT_HMAC_SECRET = 'test-only-secret-with-enough-length'
  })

  it('fails closed when the server audit secret is unavailable', () => {
    delete process.env.LEGAL_AUDIT_HMAC_SECRET
    expect(() => hmacSensitiveValue('sensitive')).toThrow('LEGAL_AUDIT_HMAC_SECRET')
  })

  it('produces a deterministic non-reversible fingerprint', () => {
    const first = hmacSensitiveValue('06 12 34 56 78')
    const second = hmacSensitiveValue('06 12 34 56 78')
    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(first).not.toContain('0612')
  })

  it('rejects sensitive metadata before writing a chained entry', async () => {
    await expect(appendComplianceAudit({
      actorUserId: 'actor-1',
      actorRole: 'admin',
      action: 'conversation_opened',
      entityType: 'conversation',
      entityId: 'conversation-1',
      reason: 'Revue du signalement actif',
      metadata: { messageContent: 'contactez-moi@example.test' }
    })).rejects.toThrow('métadonnée sensible')
    expect(query).not.toHaveBeenCalled()
  })

  it('serializes the previous hash and insertion in one locked statement', async () => {
    query.mockResolvedValue([{ id: 'audit-1', entry_hash: 'a'.repeat(64) }])

    const result = await appendComplianceAudit({
      actorUserId: 'actor-1',
      actorRole: 'admin',
      action: 'conversation_opened',
      entityType: 'conversation',
      entityId: 'conversation-1',
      reason: 'Revue du signalement actif',
      metadata: { investigationId: 'investigation-1', scopeBasis: 'linked_alert' }
    })

    expect(result).toEqual({ id: 'audit-1', entryHash: 'a'.repeat(64) })
    expect(query).toHaveBeenCalledTimes(1)
    const [statement, params] = query.mock.calls[0]
    expect(statement).toContain('pg_advisory_xact_lock')
    expect(statement).toContain('previous_hash')
    expect(statement).toContain('entry_hash')
    expect(JSON.stringify(params)).not.toContain('contactez-moi')
  })
})
