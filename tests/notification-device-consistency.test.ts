import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('notification device consistency', () => {
  it('marks resource notifications as read on the server for cross-device sync', () => {
    const actions = readFileSync('app/actions.ts', 'utf8')

    expect(actions).toContain('export async function markResourceNotificationsAsRead')
    expect(actions).toContain('link = ${resourceLink}')
    expect(actions).toContain('read_at = COALESCE(read_at, CURRENT_TIMESTAMP)')
  })

  it('refreshes notifications as soon as an app tab becomes visible again', () => {
    const provider = readFileSync('contexts/notification-context.tsx', 'utf8')

    expect(provider).toContain('window.addEventListener("focus", loadNotifications)')
    expect(provider).toContain('document.addEventListener("visibilitychange", handleVisibilityChange)')
  })

  it('clears conversation and match notifications when the related screen is opened', () => {
    const conversationPage = readFileSync('app/messages/[id]/page.tsx', 'utf8')
    const matchesPage = readFileSync('app/matches/page.tsx', 'utf8')

    expect(conversationPage).toContain('markResourceAsRead(`/messages/${id}`)')
    expect(matchesPage).toContain("markResourceNotificationsAsRead(user.id, '/matches')")
    expect(readFileSync('contexts/notification-context.tsx', 'utf8')).toContain('markResourceAsRead')
  })
})
