import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(file, 'utf8')

describe('central admin email routing', () => {
  it('routes every administrative alert to the configured mailbox', () => {
    const helper = read('lib/admin-email-notifications.ts')

    expect(helper).toContain("process.env.ADMIN_NOTIFICATION_EMAIL || 'loolyyb@gmail.com'")
    expect(helper).toContain('export async function notifyAdminByEmail')
    expect(helper).toContain('to: ADMIN_NOTIFICATION_EMAIL')
    expect(helper).toContain('nodemailer.createTransport')
  })

  it('shares the same recipient for existing feedback, concierge and event emails', () => {
    expect(read('lib/community-feedback-config.ts')).toContain('ADMIN_NOTIFICATION_EMAIL')
    expect(read('lib/event-reservation-notifications.ts')).toContain('ADMIN_NOTIFICATION_EMAIL')
    expect(read('app/api/conciergerie/route.ts')).toContain('ADMIN_NOTIFICATION_EMAIL')
  })

  it('notifies event creation and moderation', () => {
    const actions = read('actions/event-actions.ts')

    expect(actions).toContain('notifyAdminByEmail')
    expect(actions).toContain("kind: 'event_created'")
    expect(actions).toContain("kind: 'event_moderated'")
    expect(actions).toContain("kind: 'event_updated'")
    expect(actions).toContain("kind: 'event_deleted'")
    expect(actions).toContain("kind: 'events_reset'")
  })

  it('notifies moderation reports, queue entries and decisions', () => {
    const wall = read('actions/community-wall-actions.ts')
    const moderation = read('actions/admin-moderation-actions.ts')

    expect(wall).toContain('notifyAdminByEmail')
    expect(wall).toContain("kind: 'moderation_queued'")
    expect(wall).toContain("kind: 'wall_reported'")
    expect(moderation).toContain('notifyAdminByEmail')
    expect(moderation).toContain("kind: 'moderation_updated'")
  })

  it('notifies member creation, admin updates, deletion and bans', () => {
    const service = read('lib/user-service.ts')
    const users = read('actions/user-actions.ts')
    const messages = read('actions/message-actions.ts')

    expect(service).toContain('notifyAdminByEmail')
    expect(service).toContain("kind: 'member_created'")
    expect(users).toContain("kind: 'member_updated'")
    expect(users).toContain("kind: 'member_deleted'")
    expect(messages).toContain("kind: 'member_banned'")
    expect(messages).toContain("kind: 'member_unbanned'")
    expect(messages).toContain("kind: 'message_moderated'")
  })
})
