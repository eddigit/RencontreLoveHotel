import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.hoisted(() => vi.fn())
const sendMailMock = vi.hoisted(() => vi.fn())
const createTransportMock = vi.hoisted(() => vi.fn(() => ({ sendMail: sendMailMock })))

vi.mock('@/lib/db', () => ({
  sql: { query: queryMock }
}))

vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock }
}))

import { sendMemberActivityEmail } from '@/lib/member-activity-email'

const eligibleMember = {
  id: 'user-1',
  email: 'member@example.com',
  name: 'Camille',
  email_verified: true,
  status: 'active',
  is_banned: false,
  activity_email_consent: true,
  activity_email_decided_at: new Date('2026-07-13T10:00:00Z'),
  message_email_enabled: true,
  match_email_enabled: true,
  event_email_enabled: true,
  suppressed_email: null
}

describe('member activity email service', () => {
  beforeEach(() => {
    queryMock.mockReset()
    sendMailMock.mockReset()
    createTransportMock.mockClear()
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'mailer'
    process.env.SMTP_PASS = 'secret'
    process.env.SMTP_FROM = 'Love Hotel <no-reply@example.com>'
    process.env.NEXT_PUBLIC_BASE_URL = 'https://rencontrelovehotel.com'
  })

  it('does not send without an explicit master decision and consent', async () => {
    queryMock.mockResolvedValueOnce([{
      ...eligibleMember,
      activity_email_consent: false,
      activity_email_decided_at: null
    }])

    await expect(sendMemberActivityEmail({
      recipientUserId: 'user-1',
      category: 'messages',
      subject: 'Nouveau message',
      title: 'Nouveau message',
      description: 'Un membre vous a écrit.',
      ctaLabel: 'Voir la conversation',
      ctaPath: '/messages/conversation-1'
    })).resolves.toEqual({ sent: false, reason: 'consent_missing' })

    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('honors each category independently', async () => {
    queryMock.mockResolvedValueOnce([{
      ...eligibleMember,
      match_email_enabled: false
    }])

    const result = await sendMemberActivityEmail({
      recipientUserId: 'user-1',
      category: 'matches',
      subject: 'Nouveau match',
      title: 'Une nouvelle rencontre',
      description: 'Une demande vous attend.',
      ctaLabel: 'Voir mes matchs',
      ctaPath: '/matches'
    })

    expect(result).toEqual({ sent: false, reason: 'category_disabled' })
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it.each([
    [{ email_verified: false }, 'email_unverified'],
    [{ is_banned: true }, 'account_inactive'],
    [{ status: 'suspended' }, 'account_inactive'],
    [{ suppressed_email: 'member@example.com' }, 'suppressed']
  ])('blocks ineligible recipients: %s', async (override, reason) => {
    queryMock.mockResolvedValueOnce([{ ...eligibleMember, ...override }])

    await expect(sendMemberActivityEmail({
      recipientUserId: 'user-1',
      category: 'events',
      subject: 'Événement',
      title: 'Votre événement évolue',
      description: 'Une mise à jour est disponible.',
      ctaLabel: 'Voir l’événement',
      ctaPath: '/events/event-1'
    })).resolves.toEqual({ sent: false, reason })

    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('sends a safe email with direct activity and preference links', async () => {
    queryMock.mockResolvedValueOnce([eligibleMember]).mockResolvedValueOnce([])
    sendMailMock.mockResolvedValueOnce({ messageId: 'provider-1' })

    const result = await sendMemberActivityEmail({
      recipientUserId: 'user-1',
      category: 'messages',
      subject: 'Nouveau message',
      title: 'Nouveau message de <Alex>',
      description: 'Alex vous a envoyé un nouveau message.',
      ctaLabel: 'Ouvrir la conversation',
      ctaPath: '/messages/conversation-1'
    })

    expect(result).toEqual({ sent: true })
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'member@example.com',
      html: expect.stringContaining('https://rencontrelovehotel.com/messages/conversation-1'),
      text: expect.stringContaining('https://rencontrelovehotel.com/email-preferences')
    }))
    const mail = sendMailMock.mock.calls[0][0]
    expect(mail.html).toContain('&lt;Alex&gt;')
    expect(queryMock).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO email_send_logs'),
      expect.arrayContaining(['user-1', 'member@example.com', 'activity_messages', 'sent'])
    )
  })

  it('never throws into the product workflow when SMTP fails', async () => {
    queryMock.mockResolvedValueOnce([eligibleMember]).mockResolvedValueOnce([])
    sendMailMock.mockRejectedValueOnce(new Error('SMTP unavailable'))

    await expect(sendMemberActivityEmail({
      recipientUserId: 'user-1',
      category: 'events',
      subject: 'Événement',
      title: 'Mise à jour',
      description: 'Votre événement a changé.',
      ctaLabel: 'Voir',
      ctaPath: '/events/event-1'
    })).resolves.toEqual({ sent: false, reason: 'smtp_error' })

    expect(queryMock).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO email_send_logs'),
      expect.arrayContaining(['activity_events', 'error'])
    )
  })
})
