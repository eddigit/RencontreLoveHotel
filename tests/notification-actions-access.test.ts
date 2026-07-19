import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, taggedSql, getServerSession } = vi.hoisted(() => {
  const query = vi.fn()
  const taggedSql = Object.assign(vi.fn(), { query })
  return { query, taggedSql, getServerSession: vi.fn() }
})

vi.mock('@/lib/db', () => ({ sql: taggedSql }))
vi.mock('next-auth/next', () => ({ getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import {
  createAppNotification,
  getUserNotifications,
  markNotificationAsRead
} from '@/actions/notification-actions'

describe('notification action access control', () => {
  beforeEach(() => {
    query.mockReset()
    taggedSql.mockReset()
    getServerSession.mockReset()
    getServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })
  })

  it('forbids a member from reading another member notifications', async () => {
    await expect(getUserNotifications('user-2')).rejects.toThrow('propre compte')
    expect(taggedSql).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
  })

  it('cannot mark another member notification as read', async () => {
    query.mockResolvedValueOnce([])

    await expect(markNotificationAsRead('notification-user-2')).resolves.toEqual({
      success: false
    })

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('user_id = $2'),
      ['notification-user-2', 'user-1']
    )
  })

  it('blocks direct notification creation by a member', async () => {
    await expect(createAppNotification({
      userId: 'user-2',
      type: 'forged',
      title: 'Notification forgée'
    })).rejects.toThrow('administrateur')

    expect(query).not.toHaveBeenCalled()
  })
})
