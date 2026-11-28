import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn()
}))

vi.mock('nodemailer', () => ({
  default: { createTransport }
}))

import { sendRegistrationAdminNotification } from '@/lib/registration-admin-notification'

describe('registration admin notification', () => {
  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.test'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'smtp-user'
    process.env.SMTP_PASS = 'smtp-pass'
    process.env.SMTP_FROM = 'no-reply@example.test'
    process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@example.test'
    delete process.env.CONCIERGERIE_RECIPIENT_EMAIL
    delete process.env.FEEDBACK_RECIPIENT_EMAIL
    createTransport.mockReset()
    sendMail.mockReset()
    createTransport.mockReturnValue({ sendMail })
    sendMail.mockResolvedValue({})
  })

  it('sends an operator email as soon as a member account is created', async () => {
    await sendRegistrationAdminNotification({
      userId: 'user-1',
      email: 'member@example.test',
      name: 'Membre Test'
    })

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 587,
        auth: {
          user: 'smtp-user',
          pass: 'smtp-pass'
        }
      })
    )
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@example.test',
        to: 'admin@example.test',
        subject: 'Nouvelle inscription — Joug',
        html: expect.stringContaining('Membre Test')
      })
    )
  })

  it('falls back to conciergerie then feedback recipients', async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL
    process.env.CONCIERGERIE_RECIPIENT_EMAIL = 'conciergerie@example.test'
    process.env.FEEDBACK_RECIPIENT_EMAIL = 'feedback@example.test'

    await sendRegistrationAdminNotification({
      userId: 'user-1',
      email: 'member@example.test',
      name: 'Membre Test'
    })

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'conciergerie@example.test' })
    )
  })

  it('uses the operational contact when no deployment recipient variable exists', async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL
    delete process.env.CONCIERGERIE_RECIPIENT_EMAIL
    delete process.env.FEEDBACK_RECIPIENT_EMAIL

    await sendRegistrationAdminNotification({
      userId: 'user-1',
      email: 'member@example.test',
      name: 'Membre Test'
    })

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'loolyyb@gmail.com' })
    )
  })

  it('escapes member-provided values in the admin email body', async () => {
    await sendRegistrationAdminNotification({
      userId: 'user-1',
      email: 'member@example.test',
      name: '<script>alert(1)</script>'
    })

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('&lt;script&gt;alert(1)&lt;/script&gt;')
      })
    )
  })
})
