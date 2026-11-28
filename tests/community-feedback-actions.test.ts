import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const queryMock = vi.hoisted(() => vi.fn())
const requireAdminMock = vi.hoisted(() => vi.fn())
const getUserByEmailMock = vi.hoisted(() => vi.fn())
const createNotificationMock = vi.hoisted(() => vi.fn())
const sendMailMock = vi.hoisted(() => vi.fn())
const createTransportMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/community-feedback-schema', () => ({ ensureFeedbackSchema: async () => {} }))
vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }))
vi.mock('@/lib/db', () => ({ sql: { query: queryMock } }))
vi.mock('@/lib/server-auth', () => ({ requireAdmin: requireAdminMock }))
vi.mock('@/lib/user-service', () => ({ getUserByEmail: getUserByEmailMock }))
vi.mock('@/lib/notification-service', () => ({
  createAppNotificationInternal: createNotificationMock
}))
vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock }
}))

import {
  importHistoricalCommunityFeedbackNotifications,
  listCommunityFeedbackAdmin,
  submitCommunityFeedback,
  updateCommunityFeedbackStatusAdmin
} from '../actions/community-feedback-actions'

describe('community feedback actions', () => {
  beforeEach(() => {
    queryMock.mockReset()
    requireAdminMock.mockReset()
    getServerSessionMock.mockReset()
    getUserByEmailMock.mockReset()
    createNotificationMock.mockReset()
    sendMailMock.mockReset()
    createTransportMock.mockReset()
    requireAdminMock.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    getServerSessionMock.mockResolvedValue({
      user: { id: 'member-1', email: 'member@example.test', name: 'Membre' }
    })
    getUserByEmailMock.mockResolvedValue({ id: 'admin-1' })
    createTransportMock.mockReturnValue({ sendMail: sendMailMock })
    sendMailMock.mockResolvedValue({ messageId: 'mail-1' })
  })

  it('persists feedback before best-effort notification and email effects', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'feedback-1' }])

    await expect(submitCommunityFeedback({
      kind: 'bug', message: '', page: '/members?member=private', version: 'build-123',
      stepsToReproduce: '1. Ouvrir la fiche.', expected: 'Le bouton répond.', observed: 'Le bouton reste inactif.'
    })).resolves.toEqual({
      success: true,
      feedbackId: 'feedback-1',
      message: 'Merci, votre retour a bien été enregistré.'
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO community_feedback'), [
      'member-1', 'member@example.test', 'Membre', 'bug', expect.stringContaining('Étapes pour reproduire'), '/members', null
    ])
    expect(createNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ feedbackId: 'feedback-1' }),
      link: '/admin/idees'
    }))
    expect(sendMailMock).toHaveBeenCalledOnce()
  })

  it('acknowledges a retry of the same saved contribution without sending a second alert', async () => {
    queryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'previous' }])
    const result = await submitCommunityFeedback({ submissionId: 'previous', kind: 'suggestion', message: 'Une sortie dans Paris' })
    expect(result.success).toBe(true)
    expect(createNotificationMock).not.toHaveBeenCalled()
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('keeps a persisted submission successful when notification and email fail', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'feedback-1' }])
    createNotificationMock.mockRejectedValueOnce(new Error('notification unavailable'))
    sendMailMock.mockRejectedValueOnce(new Error('mail unavailable'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(submitCommunityFeedback({
      kind: 'suggestion', message: 'Ajouter une recherche par ville.', page: 'Découvrir'
    })).resolves.toMatchObject({ success: true, feedbackId: 'feedback-1' })

    expect(sendMailMock).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  it('requires admin and paginates filtered feedback in SQL', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'feedback-1', total_count: '2' }])

    await expect(listCommunityFeedbackAdmin({
      kind: 'bug', status: 'open', page: 2, pageSize: 10
    })).resolves.toMatchObject({ total: 2, page: 2, pageSize: 10 })

    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('COUNT(*) OVER()'), [
      'open', 'bug', 10, 10
    ])
    expect(queryMock.mock.calls[1][0]).toContain('AND ($2::text IS NULL OR kind = $2)')
  })

  it('requires admin before feedback administration queries', async () => {
    requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))

    await expect(listCommunityFeedbackAdmin()).rejects.toThrow('administrateur')
    await expect(updateCommunityFeedbackStatusAdmin('feedback-1', 'resolved')).rejects.toThrow('administrateur')
    await expect(importHistoricalCommunityFeedbackNotifications()).rejects.toThrow('administrateur')
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('requires explicit resolution confirmation from the administrator', async () => {
    await expect(updateCommunityFeedbackStatusAdmin('feedback-1', 'resolved')).rejects.toThrow('doit être confirmée')
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('keeps only an anonymized route in a bug report context', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'feedback-2' }])
    await submitCommunityFeedback({
      kind: 'bug', message: '',
      page: '/profile/81abf1c0-e4d0-4a20-b1da-a235e94972a1?coordinates=private',
      version: 'build-456',
      stepsToReproduce: 'Ouvrir la fiche.', expected: 'Voir la fiche.', observed: 'L écran est vide.'
    })
    expect(queryMock.mock.calls[0][1][5]).toBe('/profile/:id')
    expect(queryMock.mock.calls[0][1][4]).not.toContain('coordinates')
  })

  it('changes status with the acting administrator and imports legacy rows idempotently', async () => {
    queryMock
      .mockResolvedValueOnce([{ id: 'feedback-1', status: 'resolved' }])
      .mockResolvedValueOnce([{ id: 'legacy-feedback-1', source_notification_id: 'notification-1' }])

    await expect(updateCommunityFeedbackStatusAdmin('feedback-1', 'resolved', true)).resolves.toMatchObject({ success: true })
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('resolved_by'), [
      'feedback-1', 'resolved', 'admin-1'
    ])

    await expect(importHistoricalCommunityFeedbackNotifications(500)).resolves.toMatchObject({ importedCount: 1 })
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('ON CONFLICT (source_notification_id)'), [250])
  })
})
