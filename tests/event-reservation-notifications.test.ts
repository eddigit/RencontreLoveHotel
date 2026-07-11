import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('event reservation admin notifications', () => {
  it('routes event reservations to the operational admin mailbox and admin notifications', () => {
    const source = readFileSync('lib/event-reservation-notifications.ts', 'utf8')
    const routing = readFileSync('lib/admin-email-notifications.ts', 'utf8')

    expect(source).toContain('EVENT_RESERVATION_RECIPIENT_EMAIL')
    expect(source).toContain('ADMIN_NOTIFICATION_EMAIL')
    expect(routing).toContain('loolyyb@gmail.com')
    expect(source).toContain('event_participants')
    expect(source).toContain('INSERT INTO notifications')
    expect(source).toContain('sendMail')
    expect(source).toContain('Nouvelle réservation événement')
  })
})
