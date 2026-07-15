import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member page action recovery', () => {
  it('recovers stale deployments and stops failed polling', () => {
    const messages = readFileSync('app/messages/page.tsx', 'utf8')
    const matches = readFileSync('app/matches/page.tsx', 'utf8')
    const notifications = readFileSync('contexts/notification-context.tsx', 'utf8')

    expect(messages).toContain('recoverFromStaleServerAction')
    expect(messages).toContain('pollingStopped')
    expect(matches).toContain('recoverFromStaleServerAction')
    expect(matches).toContain('getMemberRelationships')
    expect(notifications).toContain('recoverFromStaleServerAction')
    expect(notifications).toContain('pollingStopped')
  })
})
