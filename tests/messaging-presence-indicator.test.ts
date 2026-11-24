import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('messaging presence indicators', () => {
  it('carries member online status into message list and conversation header avatars', () => {
    const listPage = readFileSync('components/messages-inbox.tsx', 'utf8')
    const threadPage = readFileSync('app/messages/[id]/page.tsx', 'utf8')

    expect(listPage).toContain('other_user_online')
    expect(threadPage).toContain('other_user_online')
    expect(listPage).toContain('conversation.other_user_online &&')
    expect(listPage).toContain('activeConversation.other_user_online &&')
    expect(threadPage).toContain('conversationDetails?.other_user_online &&')
    expect(listPage).toContain('bg-[#35e48d]')
    expect(threadPage).toContain('bg-[#35e48d]')
  })
})
