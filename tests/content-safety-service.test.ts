import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, createAppNotification } = vi.hoisted(() => ({
  query: vi.fn(),
  createAppNotification: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/actions/notification-actions', () => ({ createAppNotification }))

import { enforceMemberContent } from '@/lib/content-safety-service'

describe('content safety enforcement service', () => {
  beforeEach(() => {
    query.mockReset()
    createAppNotification.mockReset()
    process.env.LEGAL_AUDIT_HMAC_SECRET = 'test-only-secret-with-enough-length'
    delete process.env.COMPLIANCE_CONTACT_SAFETY_ENABLED
  })

  it('preserves current behavior without database writes while the flag is disabled', async () => {
    await expect(enforceMemberContent({
      actorUserId: 'user-1', surface: 'message', content: '06 12 34 56 78'
    })).resolves.toMatchObject({ decision: 'allow' })
    expect(query).not.toHaveBeenCalled()
  })

  it('records only a HMAC and masked excerpt before rejecting blocked content', async () => {
    process.env.COMPLIANCE_CONTACT_SAFETY_ENABLED = 'true'
    query.mockResolvedValueOnce([{ id: 'event-1' }]).mockResolvedValueOnce([{ attempt_count: 1 }])

    await expect(enforceMemberContent({
      actorUserId: 'user-1', surface: 'message', content: 'écris-moi à membre@example.com'
    })).rejects.toMatchObject({ code: 'OFF_PLATFORM_CONTACT_BLOCKED' })

    const [statement, params] = query.mock.calls[0]
    expect(statement).toContain('compliance_safety_events')
    expect(statement).not.toContain('content TEXT')
    expect(JSON.stringify(params)).not.toContain('membre@example.com')
    expect(JSON.stringify(params)).toContain('[email masqué]')
    expect(String(params[4])).toMatch(/^[a-f0-9]{64}$/)
    expect(createAppNotification).not.toHaveBeenCalled()
  })

  it('opens or enriches an investigation after three attempts in 24 hours', async () => {
    process.env.COMPLIANCE_CONTACT_SAFETY_ENABLED = 'true'
    query
      .mockResolvedValueOnce([{ id: 'event-3' }])
      .mockResolvedValueOnce([{ attempt_count: 3 }])
      .mockResolvedValueOnce([{ id: 'investigation-1' }])
      .mockResolvedValueOnce([{ id: 'admin-1' }])
    createAppNotification.mockResolvedValue({ success: true })

    await expect(enforceMemberContent({
      actorUserId: 'user-1', surface: 'profile', content: 'telegram @contact75'
    })).rejects.toMatchObject({ code: 'OFF_PLATFORM_CONTACT_BLOCKED' })

    expect(query.mock.calls[2][0]).toContain('moderation_investigations')
    expect(query.mock.calls[2][0]).toContain('external_contact')
    expect(createAppNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin-1',
      title: 'Alerte de sécurité communautaire',
      description: 'Des tentatives répétées de sortie de la messagerie LHR nécessitent une revue humaine.'
    }))
  })
})
