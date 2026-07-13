import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member activity email triggers', () => {
  it('notifies message recipients without exposing message content', () => {
    const source = readFileSync('actions/conversation-actions.ts', 'utf8')

    expect(source).toContain("import { sendMemberActivityEmail } from '@/lib/member-activity-email'")
    expect(source).toContain("category: 'messages'")
    expect(source).toContain('recipientUserId: recipient.user_id')
    expect(source).toContain('ctaPath: `/messages/${conversationId}`')

    const emailBlock = source.slice(
      source.indexOf('await sendMemberActivityEmail({'),
      source.indexOf('await sendMemberActivityEmail({') + 700
    )
    expect(emailBlock).not.toContain('messageContent')
    expect(emailBlock).not.toContain('content:')
  })

  it('notifies both new match requests and accepted matches', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')

    expect(source).toContain("import { sendMemberActivityEmail } from '@/lib/member-activity-email'")
    expect(source.match(/category: 'matches'/g)).toHaveLength(2)
    expect(source).toContain('recipientUserId: receiverId')
    expect(source).toContain('recipientUserId: requesterId')
    expect(source).toContain("ctaPath: '/matches'")
  })
})
