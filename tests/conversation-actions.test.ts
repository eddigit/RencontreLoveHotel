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

// Mock NextAuth pour les tests
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

import { getConversationMessages, sendMessage } from '../actions/conversation-actions'
import { sql } from '../lib/db'
import { getServerSession } from 'next-auth/next'

describe('conversation-actions', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    ;(getServerSession as any).mockReset()
  })

  it('denies access to getConversationMessages when user is not participant', async () => {
    // Mock de la session utilisateur
    ;(getServerSession as any).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440099' } })
    
    ;(sql.query as any).mockResolvedValue([])
    await expect(getConversationMessages('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440099')).rejects.toThrow('Access denied')
  })

  it('denies sending message when sender not participant', async () => {
    // Mock de la session utilisateur
    ;(getServerSession as any).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440099' } })
    
    ;(sql.query as any).mockResolvedValueOnce([]) // participant check
    await expect(sendMessage({ conversationId: '550e8400-e29b-41d4-a716-446655440001', senderId: '550e8400-e29b-41d4-a716-446655440099', content: 'hi' })).rejects.toThrow('Access denied')
  })
})
