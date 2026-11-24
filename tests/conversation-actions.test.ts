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
vi.mock('@/lib/notification-service', () => ({
  createNotificationInternal: vi.fn()
}))

// mock logger module
vi.mock('../utils/logger', () => ({
  log: vi.fn()
}))

// Mock NextAuth pour les tests
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

import {
  getUserConversations,
  getConversationSummary,
  getConversationMessagesAfter,
  getConversationMessagesBefore,
  getConversationMessages,
  markConversationMessagesAsRead,
  sendMessage
} from '../actions/conversation-actions'
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

  it('lists conversations opened by admins even without accepted match', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440099', role: 'user' }
    })
    ;(sql.query as any).mockResolvedValueOnce([])

    await getUserConversations('550e8400-e29b-41d4-a716-446655440099')

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining("other_user.role = 'admin'"),
      ['550e8400-e29b-41d4-a716-446655440099']
    )
  })

  it('does not use PostgreSQL reserved current_user as a SQL alias', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440099', role: 'user' }
    })
    ;(sql.query as any).mockResolvedValueOnce([])

    await getUserConversations('550e8400-e29b-41d4-a716-446655440099')

    const [query] = (sql.query as any).mock.calls[0]
    expect(query).not.toContain('JOIN users current_user')
    expect(query).not.toContain('current_user.role')
    expect(query).toContain('viewer_user.role')
  })

  it('keeps the single-conversation summary scoped to the authenticated member', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440099', role: 'user' }
    })
    ;(sql.query as any).mockResolvedValueOnce([])

    await getConversationSummary(
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440099'
    )

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('AND c.id = $2'),
      ['550e8400-e29b-41d4-a716-446655440099', '550e8400-e29b-41d4-a716-446655440001']
    )
  })

  it('denies sending message when participants are neither accepted match nor admin conversation', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440099' } })
    ;(sql.query as any)
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([{ user_id: '550e8400-e29b-41d4-a716-446655440098' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await expect(sendMessage({
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
      senderId: '550e8400-e29b-41d4-a716-446655440099',
      content: 'hi'
    })).rejects.toThrow('match accepté')
  })

  it('allows replying inside an admin conversation without accepted match', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440099', role: 'user' }
    })
    ;(sql.query as any)
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([{ user_id: '550e8400-e29b-41d4-a716-446655440010' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440111' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const message = await sendMessage({
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
      senderId: '550e8400-e29b-41d4-a716-446655440099',
      content: 'Merci pour l’annonce'
    })

    expect(message.id).toBe('550e8400-e29b-41d4-a716-446655440111')
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining("u.role = 'admin'"),
      ['550e8400-e29b-41d4-a716-446655440001']
    )
  })

  it('marks received unread messages as read for a conversation participant', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440099' }
    })
    ;(sql.query as any)
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440111' }])

    const result = await markConversationMessagesAsRead(
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440099'
    )

    expect(result.updatedCount).toBe(1)
    expect(sql.query).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE messages'),
      [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440099'
      ]
    )
  })

  it('fetches only messages created after a known timestamp', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440099' }
    })
    ;(sql.query as any)
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440222', content: 'Live message' }])

    const messages = await getConversationMessagesAfter(
      '550e8400-e29b-41d4-a716-446655440001',
      '2026-06-22T15:50:00.000Z',
      '550e8400-e29b-41d4-a716-446655440099'
    )

    expect(messages).toHaveLength(1)
    expect(sql.query).toHaveBeenLastCalledWith(
      expect.stringContaining('m.created_at > $2::timestamptz'),
      [
        '550e8400-e29b-41d4-a716-446655440001',
        '2026-06-22T15:50:00.000Z'
      ]
    )
  })

  it('loads older messages with a stable timestamp-and-id cursor', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440099' }
    })
    ;(sql.query as any)
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440220', content: 'Ancien message' }])

    await expect(getConversationMessagesBefore(
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440222',
      '550e8400-e29b-41d4-a716-446655440099'
    )).resolves.toHaveLength(1)

    expect(sql.query).toHaveBeenLastCalledWith(
      expect.stringContaining('m.created_at = cursor.created_at AND m.id < cursor.id'),
      [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440222',
        80
      ]
    )
  })

  it('loads the latest conversation window and renders it chronologically', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440099' }
    })
    ;(sql.query as any)
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([])

    await getConversationMessages(
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440099'
    )

    expect(sql.query).toHaveBeenLastCalledWith(
      expect.stringContaining('ORDER BY m.created_at DESC, m.id DESC'),
      [
        '550e8400-e29b-41d4-a716-446655440001',
        80
      ]
    )
    const [statement] = (sql.query as any).mock.calls.at(-1)
    expect(statement).toContain('LIMIT $2')
    expect(statement).toContain('ORDER BY m.created_at ASC, m.id ASC')
  })
})
