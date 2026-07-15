import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('LHR match lifecycle', () => {
  it('expires pending requests and excludes expired relationships', () => {
    const actions = readFileSync('actions/user-actions.ts', 'utf8')
    const relationships = readFileSync('lib/member-relationship-service.ts', 'utf8')

    expect(actions).toContain("INTERVAL '30 days'")
    expect(actions).toContain('expires_at')
    expect(relationships).toContain("um.expires_at IS NULL OR um.expires_at > NOW()")
  })

  it('blocks unsafe requests and atomically creates a conversation on acceptance', () => {
    const actions = readFileSync('actions/user-actions.ts', 'utf8')
    expect(actions).toContain('FROM user_blocks')
    expect(actions).toContain('accepted_match AS')
    expect(actions).toContain('selected_conversation AS')
    expect(actions).toContain('responded_at = CURRENT_TIMESTAMP')
    expect(actions).toContain("eventName: 'match_accepted'")
  })

  it('keeps the API route on the atomic acceptance result', () => {
    const route = readFileSync('app/api/accept-match/route.ts', 'utf8')
    expect(route).not.toContain('findOrCreateConversation')
    expect(route).toContain('result.conversationId')
  })
})
