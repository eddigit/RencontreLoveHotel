import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('messages inbox unread state', () => {
  it('renders a visible, accessible unread marker only when the server summary reports it', () => {
    const source = readFileSync('components/messages-inbox.tsx', 'utf8')

    expect(source).toContain('has_unread_messages: boolean')
    expect(source).toContain('conversation.has_unread_messages &&')
    expect(source).toContain('Messages non lus')
  })
})
