import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'

const sqlQueryMock = vi.hoisted(() => vi.fn())
const requireCurrentUserMock = vi.hoisted(() => vi.fn())
const requireAdminMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db', () => ({ sql: { query: sqlQueryMock } }))
vi.mock('@/lib/server-auth', () => ({
  requireCurrentUser: requireCurrentUserMock,
  requireAdmin: requireAdminMock
}))

import {
  recordProductActivity,
  sanitizeProductActivityMetadata
} from '@/lib/product-activity'

describe('product activity tracking', () => {
  beforeEach(() => {
    sqlQueryMock.mockReset()
    requireCurrentUserMock.mockReset()
    requireAdminMock.mockReset()
  })

  it('keeps only non-sensitive aggregate metadata', () => {
    expect(sanitizeProductActivityMetadata({
      resultCount: 12,
      filterCount: 2,
      source: 'members',
      query: 'nom recherché',
      email: 'member@example.com',
      content: 'message privé'
    })).toEqual({ resultCount: 12, filterCount: 2, source: 'members' })
  })

  it('records an allowed event without exposing member content', async () => {
    sqlQueryMock.mockResolvedValueOnce([])

    await expect(recordProductActivity({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      eventType: 'member_search',
      targetType: 'directory',
      metadata: { resultCount: 4, query: 'couple Paris' }
    })).resolves.toBe(true)

    expect(sqlQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO product_activity_events'),
      expect.arrayContaining([
        '11111111-1111-4111-8111-111111111111',
        'member_search',
        JSON.stringify({ resultCount: 4 })
      ])
    )
  })

  it('defines database triggers for activity-producing writes', () => {
    const migration = readFileSync(
      'migrations/20260711_product_activity_events.sql',
      'utf8'
    )
    for (const eventType of [
      'match_requested', 'match_accepted', 'conversation_started',
      'message_sent', 'event_created', 'event_joined', 'wall_post_created'
    ]) {
      expect(migration).toContain(eventType)
    }
    expect(migration).not.toContain('NEW.content')
    expect(migration).not.toContain('NEW.email')
  })

  it('requires a session to record a profile view', async () => {
    requireCurrentUserMock.mockRejectedValueOnce(new Error('Authentification requise'))
    const { recordProfileView } = await import('@/actions/product-activity-actions')

    await expect(recordProfileView('22222222-2222-4222-8222-222222222222'))
      .rejects.toThrow('Authentification requise')
    expect(sqlQueryMock).not.toHaveBeenCalled()
  })

  it('requires an administrator to aggregate product activity', async () => {
    requireAdminMock.mockRejectedValueOnce(new Error('Accès administrateur requis'))
    const { getProductActivitySummary } = await import('@/actions/product-activity-actions')

    await expect(getProductActivitySummary()).rejects.toThrow('administrateur')
    expect(sqlQueryMock).not.toHaveBeenCalled()
  })
})
