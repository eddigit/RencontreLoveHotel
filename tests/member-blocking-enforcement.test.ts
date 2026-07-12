import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('personal block enforcement', () => {
  const conversations = readFileSync('actions/conversation-actions.ts', 'utf8')
  const users = readFileSync('actions/user-actions.ts', 'utf8')

  it('enforces blocks on message, conversation and match writes', () => {
    expect(conversations).toContain("import { assertUsersCanInteract } from '@/lib/member-safety'")
    expect(conversations.match(/assertUsersCanInteract/g)?.length).toBeGreaterThanOrEqual(3)
    expect(users).toContain("import { assertUsersCanInteract } from '@/lib/member-safety'")
    expect(users.match(/assertUsersCanInteract/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('excludes blocked pairs reciprocally from member discovery', () => {
    expect(users).toContain('NOT EXISTS (')
    expect(users).toContain('FROM user_blocks ub')
    expect(users).toContain('ub.blocker_id = $1 AND ub.blocked_id = u.id')
    expect(users).toContain('ub.blocker_id = u.id AND ub.blocked_id = $1')
    expect(users.match(/FROM user_blocks ub/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('keeps conversation history while returning a read-only interaction state', () => {
    expect(conversations).toContain('AS can_interact')
    expect(conversations).toContain('FROM user_blocks ub')
  })
})
