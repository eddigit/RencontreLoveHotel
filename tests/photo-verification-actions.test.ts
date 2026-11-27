import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, requireCurrentUser, requireAdmin, ensureSchema, purgeExpired } = vi.hoisted(() => ({ query: vi.fn(), requireCurrentUser: vi.fn(), requireAdmin: vi.fn(), ensureSchema: vi.fn(), purgeExpired: vi.fn() }))
vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser, requireAdmin }))
vi.mock('@/lib/private-photo-verification', () => ({ ensurePrivatePhotoVerificationSchema: ensureSchema, purgeExpiredPrivatePhotoVerifications: purgeExpired, recodePrivateVerificationImage: vi.fn(), PHOTO_VERIFICATION_ID: /^[0-9a-f-]{36}$/i }))
vi.mock('@/lib/photo-verification-badge', () => ({ verifiedPhotoPredicateSql: () => '(TRUE)' }))

import { getPublicProfileVerified, reviewPhotoVerificationRequest, withdrawPhotoVerificationRequest } from '@/actions/photo-verification-actions'

const memberId = '550e8400-e29b-41d4-a716-446655440001'
const requestId = '550e8400-e29b-41d4-a716-446655440002'

describe('private photo verification actions', () => {
  beforeEach(() => { query.mockReset(); requireCurrentUser.mockReset(); requireAdmin.mockReset(); ensureSchema.mockReset(); purgeExpired.mockReset(); requireCurrentUser.mockResolvedValue({ id: memberId }); requireAdmin.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440003', role: 'admin' }) })

  it('lets a member remove an approved badge so a new proof can be submitted', async () => {
    query.mockResolvedValueOnce([{ id: requestId }])
    await expect(withdrawPhotoVerificationRequest()).resolves.toEqual({ removed: true })
    expect(query.mock.calls.at(-1)?.[0]).toContain("status IN ('pending', 'approved')")
    expect(query.mock.calls.at(-1)?.[0]).toContain('evidence_image = NULL')
  })

  it('permits admin removal after approval while purging bytes', async () => {
    query.mockResolvedValueOnce([{ id: requestId, user_id: memberId, identity_kind: 'solo', pseudonym_snapshot: 'Pseudo', status: 'removed', submitted_at: '2026-11-28', expires_at: '2026-12-28', decided_at: '2026-11-28', decision_note: null, evidence_available: false }])
    await expect(reviewPhotoVerificationRequest(requestId, { decision: 'remove' })).resolves.toMatchObject({ status: 'removed', evidenceAvailable: false })
    const statement = query.mock.calls.at(-1)?.[0]
    expect(statement).toContain("$2 = 'removed' AND status = 'approved'")
    expect(statement).toContain('evidence_image = NULL')
  })

  it('uses the shared eligibility predicate without purging on a public badge read', async () => {
    query.mockResolvedValueOnce([{ verified: true }])
    await expect(getPublicProfileVerified(memberId)).resolves.toBe(true)
    expect(ensureSchema).toHaveBeenCalledOnce()
    expect(purgeExpired).not.toHaveBeenCalled()
    expect(query.mock.calls[0][0]).toContain('SELECT EXISTS')
  })
})
