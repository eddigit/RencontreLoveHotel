import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('admin statistics period integrity', () => {
  it('uses an exclusive next-day end boundary so today is not dropped', () => {
    const component = readFileSync('components/admin-stats.tsx', 'utf8')
    expect(component).toContain('end.setDate(end.getDate() + 1)')
  })

  it('guards message statistics and uses half-open date ranges', () => {
    const conversations = readFileSync('actions/conversation-actions.ts', 'utf8')
    const users = readFileSync('actions/user-actions.ts', 'utf8')
    const events = readFileSync('actions/event-actions.ts', 'utf8')
    expect(conversations.slice(conversations.indexOf('export async function getMessagesStats'))).toContain('await requireAdmin()')
    expect(conversations).toContain('created_at >= $1 AND created_at < $2')
    expect(users).toContain('created_at >= $1 AND created_at < $2')
    expect(users).toContain('accepted_at >= $1 AND accepted_at < $2')
    expect(events).toContain('created_at >= $1 AND created_at < $2')
  })
})
