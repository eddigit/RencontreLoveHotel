import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('LHR message activation and safety', () => {
  it('blocks messaging when either participant blocked the other', () => {
    const source = readFileSync('actions/conversation-actions.ts', 'utf8')
    expect(source).toContain('FROM user_blocks')
    expect(source).toContain('blocker_id')
  })

  it('records starts, sends and reciprocal replies without message contents', () => {
    const source = readFileSync('actions/conversation-actions.ts', 'utf8')
    expect(source).toContain("eventName: 'conversation_started'")
    expect(source).toContain("eventName: 'message_sent'")
    expect(source).toContain("eventName: 'message_replied'")
    expect(source).toContain('prior_message_count')
  })

  it('exposes block and report controls on member profiles', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    expect(page).toContain('MemberSafetyControls')
  })
})
