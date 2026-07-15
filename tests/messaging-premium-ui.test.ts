import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('premium messaging UI', () => {
  it('uses real conversation state instead of demo copy', () => {
    const listPage = readFileSync('app/messages/page.tsx', 'utf8')
    const conversationPage = readFileSync('app/messages/[id]/page.tsx', 'utf8')
    const action = readFileSync('actions/conversation-actions.ts', 'utf8')
    const mobileNavigation = readFileSync('components/mobile-navigation.tsx', 'utf8')
    const notificationContext = readFileSync('contexts/notification-context.tsx', 'utf8')

    expect(listPage).toContain('unread_count')
    expect(listPage).toContain('Trouver un membre')
    expect(listPage).toContain('Équipe Love Hotel')
    expect(listPage).not.toContain('Messagerie V2')
    expect(listPage).not.toContain('Architecture cible')
    expect(listPage).not.toContain('La conversation complète est prête')
    expect(conversationPage).toContain('Support Love Hotel')
    expect(conversationPage).toContain('Commencer la conversation')
    expect(action).toContain('AS unread_count')
    expect(action).toContain('COALESCE(unread_messages.is_read, false) = false')
    expect(action).toContain('UPDATE notifications')
    expect(action).toContain("type = 'new_message'")
    expect(mobileNavigation).toContain('badge: counts.messages')
    expect(mobileNavigation).not.toContain('badge: 3')
    expect(notificationContext).toContain("['message', 'new_message'].includes(n.type)")
  })
})
