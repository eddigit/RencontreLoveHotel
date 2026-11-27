import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMailMock = vi.hoisted(() => vi.fn())
const createTransportMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => Object.assign(vi.fn(), { query: vi.fn() }))

vi.mock('@/lib/db', () => ({ sql: sqlMock }))
vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock }
}))

import { sendMemberActivityEmail } from '@/lib/member-activity-email'

const messageInput = {
  recipientId: 'member-1',
  purpose: 'message_alert' as const,
  notificationKey: 'message:1',
  subject: 'Nouveau message',
  text: 'Vous avez reçu un nouveau message.',
  path: '/messages/thread-1'
}

describe('optional member activity email', () => {
  beforeEach(() => {
    sqlMock.query.mockReset()
    sendMailMock.mockReset().mockResolvedValue({ messageId: 'email-1' })
    createTransportMock.mockReset().mockReturnValue({ sendMail: sendMailMock })
    process.env.SMTP_HOST = 'smtp.example.test'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'user'
    process.env.SMTP_PASS = 'pass'
  })

  it('does not send a suppressed or disabled optional alert', async () => {
    sqlMock.query.mockResolvedValueOnce([{
      email: 'member@example.test', email_verified: true, status: 'active', is_banned: false,
      suppressed_email: 'member@example.test', activity_email_consent: true,
      message_email_enabled: true
    }])

    await expect(sendMemberActivityEmail(messageInput)).resolves.toEqual({ sent: false, reason: 'suppressed' })
    expect(sendMailMock).not.toHaveBeenCalled()
    expect(sqlMock.query).toHaveBeenCalledTimes(1)
  })

  it('claims a delivery before sending and does not retry a duplicate', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{
        email: 'member@example.test', email_verified: true, status: 'active', is_banned: false,
        activity_email_consent: true, message_email_enabled: true
      }])
      .mockResolvedValueOnce([])

    await expect(sendMemberActivityEmail(messageInput)).resolves.toEqual({ sent: false, reason: 'duplicate' })
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('sends generic privacy-safe content after an eligible claim', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{
        email: 'member@example.test', email_verified: true, status: 'active', is_banned: false,
        activity_email_consent: true, message_email_enabled: true
      }])
      .mockResolvedValueOnce([{ id: 'delivery-1' }])
      .mockResolvedValueOnce([])

    await expect(sendMemberActivityEmail(messageInput)).resolves.toEqual({ sent: true })
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'member@example.test',
      text: expect.not.stringContaining('sender')
    }))
  })

  it('does not make the underlying action fail when SMTP throws', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{
        email: 'member@example.test', email_verified: true, status: 'active', is_banned: false,
        activity_email_consent: true, message_email_enabled: true
      }])
      .mockResolvedValueOnce([{ id: 'delivery-1' }])
    sendMailMock.mockRejectedValueOnce(new Error('SMTP unavailable'))

    await expect(sendMemberActivityEmail(messageInput)).resolves.toEqual({ sent: false, reason: 'delivery_failed' })
  })

  it('does not send optional activity email to an unverified address', async () => {
    sqlMock.query.mockResolvedValueOnce([{
      email: 'member@example.test', email_verified: false, status: 'active', is_banned: false,
      activity_email_consent: true, message_email_enabled: true
    }])

    await expect(sendMemberActivityEmail(messageInput)).resolves.toEqual({ sent: false, reason: 'email_unverified' })
    expect(sendMailMock).not.toHaveBeenCalled()
  })
})
