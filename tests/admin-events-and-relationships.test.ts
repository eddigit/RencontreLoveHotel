import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('admin events inventory and member relationships', () => {
  it('keeps member-only publication filtering out of the administrative upcoming inventory', () => {
    const source = readFileSync('actions/event-actions.ts', 'utf8')
    const adminFunction = source.slice(source.indexOf('export async function getAdminUpcomingEvents'))

    expect(adminFunction).toContain('await requireAdmin()')
    expect(adminFunction).toContain('getUpcomingEventsQuery(undefined, false)')
  })

  it('classifies same-day events with their configured time and displays the selected primary portrait', () => {
    const pastRoute = readFileSync('app/api/admin/events/past/route.ts', 'utf8')
    const relationships = readFileSync('lib/member-relationship-service.ts', 'utf8')

    expect(pastRoute).toContain("e.event_date::date + COALESCE(e.event_time::time, TIME '23:59:59')")
    expect(relationships).toContain('COALESCE(primary_photo.url, other_user.avatar) AS other_user_avatar')
  })

  it('keeps profile links outside the conversation selection button', () => {
    const messages = readFileSync('app/admin/messages/page.tsx', 'utf8')

    expect(messages).toContain("<article key={conversation.id}")
    expect(messages).toContain("aria-label={`Ouvrir la conversation")
    expect(messages).not.toContain('onClick={event => event.stopPropagation()}')
  })
})
