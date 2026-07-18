import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, requireModerator, requireAdmin, requireCurrentUser, createAppNotification } = vi.hoisted(() => ({
  query: vi.fn(),
  requireModerator: vi.fn(),
  requireAdmin: vi.fn(),
  requireCurrentUser: vi.fn(),
  createAppNotification: vi.fn()
}))

vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/moderation-auth', () => ({ requireModerator }))
vi.mock('@/lib/server-auth', () => ({ requireAdmin, requireCurrentUser }))
vi.mock('@/actions/notification-actions', () => ({ createAppNotification }))

import {
  getInvestigationConversations,
  getModerationInvestigation,
  getModerationInvestigations,
  sendOfficialModerationMessage
} from '@/actions/moderation-investigation-actions'

const row = {
  id: 'investigation-1', subject_user_id: 'user-1', subject_pseudonym: 'Membre-12345678',
  name: 'Alice', email: 'alice@example.test', avatar: 'https://blob.test/a.jpg',
  category: 'paid_solicitation', priority: 100, status: 'open', severity: 'high',
  open_alerts: 3, latest_alert_at: new Date(), enhanced_access_until: new Date()
}

describe('moderation investigation actions', () => {
  beforeEach(() => {
    query.mockReset()
    requireModerator.mockReset()
    requireAdmin.mockReset()
    requireCurrentUser.mockReset()
    createAppNotification.mockReset()
  })

  it('pseudonymizes the grouped queue for a community moderator', async () => {
    requireModerator.mockResolvedValue({ id: 'mod-1', role: 'community_moderator' })
    query.mockResolvedValueOnce([row])
    const result = await getModerationInvestigations()
    expect(result[0]).toMatchObject({ id: 'investigation-1', subject: 'Membre-12345678', openAlerts: 3 })
    expect(result[0]).not.toHaveProperty('subjectUserId')
    expect(result[0]).not.toHaveProperty('email')
    expect(result[0]).not.toHaveProperty('avatar')
  })

  it('returns full identity to an admin and logs the focused dossier access', async () => {
    requireModerator.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    query.mockResolvedValueOnce([{ ...row, alerts: [] }]).mockResolvedValueOnce([])
    const result = await getModerationInvestigation('investigation-1')
    expect(result).toMatchObject({ subjectUserId: 'user-1', name: 'Alice', email: 'alice@example.test' })
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('moderation_case_access'), expect.arrayContaining([
      'investigation-1', 'admin-1', 'admin', 'investigation'
    ]))
  })

  it('reserves the complete conversation history to administrators', async () => {
    requireAdmin.mockRejectedValue(new Error('Accès administrateur requis'))
    await expect(getInvestigationConversations('investigation-1')).rejects.toThrow('administrateur')
    expect(query).not.toHaveBeenCalled()
  })

  it('sends an official message outside private conversations and notifies the member', async () => {
    requireAdmin.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    query
      .mockResolvedValueOnce([{ subject_user_id: 'user-1' }])
      .mockResolvedValueOnce([{ id: 'official-1', created_at: new Date() }])
      .mockResolvedValueOnce([])
    createAppNotification.mockResolvedValue({ success: true })

    const result = await sendOfficialModerationMessage('investigation-1', 'Merci de répondre à cet avertissement officiel.')
    expect(result).toMatchObject({ success: true, messageId: 'official-1' })
    expect(query.mock.calls[1][0]).toContain('moderation_official_messages')
    expect(createAppNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', type: 'official_moderation_message', link: '/account/moderation'
    }))
  })

  it('records a community moderator recommendation without sanctioning the member', async () => {
    const actions = await import('@/actions/moderation-investigation-actions')
    requireModerator.mockResolvedValue({ id: 'mod-1', role: 'community_moderator' })
    query.mockResolvedValueOnce([{ id: 'investigation-1' }]).mockResolvedValueOnce([])
    await expect(actions.recommendInvestigationAction({
      investigationId: 'investigation-1', recommendation: 'warning', reason: 'Contexte vérifié par le modérateur.'
    })).resolves.toEqual({ success: true })
    expect(query.mock.calls[1][0]).toContain('moderator_recommendation')
    expect(query.mock.calls.some(([statement]) => String(statement).includes('UPDATE users'))).toBe(false)
  })
})
