import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member event activity emails', () => {
  it('confirms event joins and cancellations to the participant', () => {
    const source = readFileSync('lib/event-reservation-notifications.ts', 'utf8')

    expect(source).toContain("import { sendMemberActivityEmail } from '@/lib/member-activity-email'")
    expect(source).toContain('recipientUserId: participant.id')
    expect(source).toContain("category: 'events'")
    expect(source).toContain('ctaPath: `/events/${event.id}`')
    expect(source).toContain("action === 'join'")
  })

  it('notifies creators of moderation and participants of event announcements', () => {
    const source = readFileSync('actions/event-actions.ts', 'utf8')

    expect(source).toContain("import { sendMemberActivityEmail } from '@/lib/member-activity-email'")
    expect(source).toContain('recipientUserId: event.creator_id')
    expect(source).toContain('recipientUserId: participant.user_id')
    expect(source.match(/category: 'events'/g)?.length).toBeGreaterThanOrEqual(2)
    expect(source).toContain('ctaPath: `/events/${eventId}`')
  })
})
