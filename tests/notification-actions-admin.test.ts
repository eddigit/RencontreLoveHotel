import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

import {
  notifyAdmins,
  sendInternalMessageToAllUsers,
  sendInternalMessageToSelectedUsers
} from '../actions/notification-actions'
import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth/next'

describe('admin notification actions', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    ;(getServerSession as any).mockReset()
    ;(getServerSession as any).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' }
    })
  })

  it('blocks admin broadcasts for non-admin users', async () => {
    ;(getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' }
    })

    await expect(
      notifyAdmins({
        type: 'moderation_alert',
        title: 'Message suspect'
      })
    ).rejects.toThrow('administrateur')
    expect(sql.query).not.toHaveBeenCalled()
  })

  it('creates one high priority admin notification for every active admin', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([
        { id: '11111111-1111-4111-8111-111111111111' },
        { id: '22222222-2222-4222-8222-222222222222' }
      ])
      .mockResolvedValueOnce([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }])
      .mockResolvedValueOnce([{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }])

    const result = await notifyAdmins({
      type: 'moderation_alert',
      title: 'Message suspect',
      description: 'Un message contient un mot cle sensible.',
      priority: 'high',
      category: 'moderation',
      link: '/admin/moderation',
      metadata: {
        sourceType: 'message',
        sourceId: '33333333-3333-4333-8333-333333333333'
      }
    })

    expect(result).toEqual({ success: true, notifiedCount: 2 })
    expect(sql.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("role = 'admin'"),
      []
    )
    expect(sql.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO notifications'),
      [
        '11111111-1111-4111-8111-111111111111',
        'moderation_alert',
        'Message suspect',
        'Un message contient un mot cle sensible.',
        '/admin/moderation',
        null,
        'high',
        'moderation',
        'admin',
        JSON.stringify({
          sourceType: 'message',
          sourceId: '33333333-3333-4333-8333-333333333333'
        }),
        null
      ]
    )
  })

  it('blocks internal broadcast messages for non-admin users', async () => {
    ;(getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' }
    })

    await expect(
      sendInternalMessageToAllUsers({
        title: 'Annonce Love Hotel',
        description: 'Nouvelle expérience jacuzzi disponible.'
      })
    ).rejects.toThrow('administrateur')
    expect(sql.query).not.toHaveBeenCalled()
  })

  it('creates an exchangeable admin conversation for every active non-banned user', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([
        { id: '11111111-1111-4111-8111-111111111111' },
        { id: '22222222-2222-4222-8222-222222222222' }
      ])
      .mockResolvedValueOnce([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }])
      .mockResolvedValueOnce([{ id: 'message-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'notification-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'message-2' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'notification-2' }])

    const result = await sendInternalMessageToAllUsers({
      title: 'Annonce Love Hotel',
      description: 'Nouvelle expérience jacuzzi disponible.',
      priority: 'high',
      link: '/events'
    })

    expect(result).toEqual({
      success: true,
      sentCount: 2,
      messageCount: 2,
      recipientCount: 2,
      createdConversationCount: 1
    })
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining("COALESCE(u.status, 'active') = 'active'"),
      ['admin-1']
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('COALESCE(u.is_banned, false) = false'),
      ['admin-1']
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO conversations'),
      []
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO messages'),
      [
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'admin-1',
        'Nouvelle expérience jacuzzi disponible.'
      ]
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.arrayContaining([
        '11111111-1111-4111-8111-111111111111',
        'admin_broadcast',
        'Annonce Love Hotel',
        'Nouvelle expérience jacuzzi disponible.',
        '/messages/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      ])
    )
  })

  it('targets only the selected active members for a direct admin message', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([
        { id: '11111111-1111-4111-8111-111111111111' }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'message-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'notification-1' }])

    const result = await sendInternalMessageToSelectedUsers({
      userIds: [
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111'
      ],
      title: 'Réponse de Love Hotel',
      description: 'Bonjour, voici la réponse à votre question.'
    })

    expect(result.recipientCount).toBe(1)
    expect(sql.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('u.id = ANY($2::uuid[])'),
      ['admin-1', ['11111111-1111-4111-8111-111111111111']]
    )
  })
})
