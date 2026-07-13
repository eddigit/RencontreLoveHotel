import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('messaging runtime resilience', () => {
  const listPage = readFileSync('app/messages/page.tsx', 'utf8')
  const conversationPage = readFileSync('app/messages/[id]/page.tsx', 'utf8')
  const notificationContext = readFileSync('contexts/notification-context.tsx', 'utf8')

  it('recovers messaging pages after a deployment invalidates server actions', () => {
    expect(listPage).toContain("import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'")
    expect(listPage).toContain('recoverFromStaleServerAction(error)')
    expect(conversationPage).toContain("import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'")
    expect(conversationPage.match(/recoverFromStaleServerAction\(error\)/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('does not restart conversation polling when notification callbacks change', () => {
    expect(listPage).not.toContain('const { markAsRead } = useNotifications()')
    expect(listPage).not.toContain('[session?.user?.id, markAsRead]')
    expect(notificationContext).toContain('const markAsRead = useCallback')
  })

  it('counts the notification types that production actually emits', () => {
    expect(notificationContext).toContain("['event', 'event_reservation', 'event_moderation']")
    expect(notificationContext).toContain("['match', 'match_request', 'match_accepted']")
  })
})
