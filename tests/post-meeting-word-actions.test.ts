import { beforeEach, describe, expect, it, vi } from 'vitest'
const { query, requireCurrentUser, enforce, notify } = vi.hoisted(() => ({
  query: vi.fn(),
  requireCurrentUser: vi.fn(),
  enforce: vi.fn(),
  notify: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser }))
vi.mock('@/lib/content-safety-service', () => ({
  enforceMemberContent: enforce,
}))
vi.mock('@/lib/post-meeting-words', () => ({
  ensurePostMeetingWordsSchema: vi.fn(),
}))
vi.mock('@/lib/notification-service', () => ({
  createAppNotificationInternal: notify,
}))
vi.mock('@/actions/member-safety-actions', () => ({ reportMember: vi.fn() }))
import {
  submitPostMeetingWord,
  respondToPostMeetingWord,
  withdrawPostMeetingWord,
} from '@/actions/post-meeting-word-actions'
const a = '550e8400-e29b-41d4-a716-446655440001',
  b = '550e8400-e29b-41d4-a716-446655440002',
  w = '550e8400-e29b-41d4-a716-446655440003'
const row = {
  id: w,
  author_id: a,
  recipient_id: b,
  author_pseudonym_snapshot: 'A',
  recipient_pseudonym_snapshot: 'B',
  message: 'Très bon moment',
  status: 'pending',
  created_at: '2026-11-28',
  recipient_decision_at: null,
  withdrawn_at: null,
}
describe('post meeting words', () => {
  beforeEach(() => {
    query.mockReset()
    requireCurrentUser.mockReset()
    enforce.mockReset()
    notify.mockReset()
    requireCurrentUser.mockResolvedValue({ id: a })
    notify.mockResolvedValue(undefined)
  })
  it('requires both author attestations, visible active profiles, bidirectional no-block and one oriented pair', async () => {
    query.mockResolvedValueOnce([row])
    await submitPostMeetingWord({
      recipientUserId: b,
      message: 'Très bon moment',
      confirmMeeting: true,
      acceptPublication: true,
    })
    const s = query.mock.calls[0][0]
    expect(s).toContain("INTERVAL '24 hours'")
    expect(s).toContain('FROM user_blocks')
    expect(s).toContain('ON CONFLICT (author_id,recipient_id) DO NOTHING')
    expect(enforce).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'message' }),
    )
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: b,
        link: '/profile?tab=profile#post-meeting-words',
      }),
    )
  })
  it('only publishes after recipient confirms meeting and consents', async () => {
    requireCurrentUser.mockResolvedValue({ id: b })
    query.mockResolvedValueOnce([
      { ...row, status: 'accepted', recipient_decision_at: '2026-11-28' },
    ])
    await expect(
      respondToPostMeetingWord(w, {
        confirmMeeting: true,
        acceptPublication: true,
      }),
    ).resolves.toMatchObject({ status: 'accepted' })
    expect(query.mock.calls[0][1]).toEqual([w, b, 'accepted', true, true])
  })
  it('lets either party withdraw a pending or accepted word', async () => {
    query.mockResolvedValueOnce([
      { ...row, status: 'withdrawn', withdrawn_at: '2026-11-28' },
    ])
    await expect(withdrawPostMeetingWord(w)).resolves.toMatchObject({
      status: 'withdrawn',
    })
    expect(query.mock.calls[0][0]).toContain("status IN ('pending','accepted')")
  })
})
