import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock the sql module for both relative and tsconfig alias imports
vi.mock('../lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('@/lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

// mock notification actions alias import
vi.mock('@/actions/notification-actions', () => ({
  createNotification: vi.fn()
}))

// mock logger module
vi.mock('../utils/logger', () => ({
  log: vi.fn()
}))

import { getConversationMessages, sendMessage } from '../actions/conversation-actions'
import { sql } from '../lib/db'

describe('conversation-actions', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
  })

  it('denies access to getConversationMessages when user is not participant', async () => {
    ;(sql.query as any).mockResolvedValue([])
    await expect(getConversationMessages('conv-1', 'user-unknown')).rejects.toThrow('Access denied')
  })

  it('denies sending message when sender not participant', async () => {
    ;(sql.query as any).mockResolvedValueOnce([]) // participant check
    await expect(sendMessage({ conversationId: 'conv-1', senderId: 'user-unknown', content: 'hi' })).rejects.toThrow('Access denied')
  })
})
