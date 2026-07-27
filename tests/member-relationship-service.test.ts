import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/presence', () => ({
  ensurePresenceSchema: vi.fn().mockResolvedValue(true),
  onlinePresenceCondition: (column = 'u.last_seen_at') => `(${column} >= NOW() - INTERVAL '5 minutes')`
}))

import {
  getMemberConversationSummaries,
  getMemberRelationshipOverview
} from '@/lib/member-relationship-service'

describe('member relationship service', () => {
  beforeEach(() => query.mockReset())

  it('normalizes empty conversation and relationship results', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    await expect(getMemberConversationSummaries('member-1')).resolves.toEqual([])
    await expect(getMemberRelationshipOverview('member-1')).resolves.toEqual({
      accepted: [],
      incoming: [],
      outgoing: []
    })
  })

  it('falls back to text-only conversation summaries when attachments are unavailable', async () => {
    query
      .mockRejectedValueOnce(Object.assign(new Error('missing relation'), { code: '42P01' }))
      .mockResolvedValueOnce([{ id: 'conversation-1', last_message: 'Bonjour' }])

    await expect(getMemberConversationSummaries('member-1')).resolves.toEqual([
      expect.objectContaining({ id: 'conversation-1', last_message: 'Bonjour' })
    ])
    expect(query).toHaveBeenCalledTimes(2)
    expect(query.mock.calls[1][0]).not.toContain('message_attachments')
  })

  it('includes the other member presence status in conversation summaries', async () => {
    query.mockResolvedValueOnce([])

    await getMemberConversationSummaries('member-1')

    expect(query.mock.calls[0][0]).toContain('AS other_user_online')
    expect(query.mock.calls[0][0]).toContain('other_user.last_seen_at')
  })

  it('groups accepted, incoming and outgoing relationship rows', async () => {
    query.mockResolvedValueOnce([
      { relationship_kind: 'accepted', other_user_id: 'a' },
      { relationship_kind: 'incoming', other_user_id: 'b' },
      { relationship_kind: 'outgoing', other_user_id: 'c' }
    ])

    await expect(getMemberRelationshipOverview('member-1')).resolves.toEqual({
      accepted: [expect.objectContaining({ other_user_id: 'a' })],
      incoming: [expect.objectContaining({ other_user_id: 'b' })],
      outgoing: [expect.objectContaining({ other_user_id: 'c' })]
    })
  })

  it('does not expose expired pending requests', async () => {
    query.mockResolvedValueOnce([])
    await getMemberRelationshipOverview('member-1')
    expect(query.mock.calls[0][0]).toContain('um.expires_at IS NULL OR um.expires_at > NOW()')
  })
})
