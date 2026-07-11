import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const executeQueryMock = vi.hoisted(() => vi.fn())
const saveOnboardingDataMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => {
  const fn = vi.fn()
  return Object.assign(fn, { query: vi.fn() })
})

vi.mock('next-auth/next', () => ({
  getServerSession: getServerSessionMock
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@/lib/db', () => ({
  executeQuery: executeQueryMock,
  sql: sqlMock
}))

vi.mock('@/lib/onboarding-service', () => ({
  saveOnboardingData: saveOnboardingDataMock
}))

describe('notification access control', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    executeQueryMock.mockReset()
    saveOnboardingDataMock.mockReset()
    sqlMock.mockReset()
    sqlMock.query.mockReset()
  })

  it('returns no notifications for another account without querying the database', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        role: 'user'
      }
    })

    const { getNotifications } = await import('@/app/actions')

    await expect(
      getNotifications('22222222-2222-4222-8222-222222222222')
    ).resolves.toEqual({ notifications: [] })
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('marks only the connected user notification as read', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        role: 'user'
      }
    })
    sqlMock.mockResolvedValue([])

    const { markNotificationAsRead } = await import('@/app/actions')

    await markNotificationAsRead('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    const updateValues = sqlMock.mock.calls.at(-1)?.slice(1)
    expect(updateValues).toEqual([
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111'
    ])
  })

  it('blocks the legacy notification reader for another account', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        role: 'user'
      }
    })

    const { getUserNotifications } = await import('@/actions/notification-actions')

    await expect(
      getUserNotifications('22222222-2222-4222-8222-222222222222')
    ).rejects.toThrow('propre compte')
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('prevents a member from creating a notification for another member', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        role: 'user'
      }
    })

    const { createNotification } = await import('@/actions/notification-actions')

    await expect(
      createNotification({
        userId: '22222222-2222-4222-8222-222222222222',
        type: 'message',
        title: 'Fausse notification'
      })
    ).rejects.toThrow('administrateur')
    expect(sqlMock.query).not.toHaveBeenCalled()
  })

  it('blocks preference saving for another account', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        role: 'user'
      }
    })

    const { saveUserPreferences } = await import('@/app/actions')

    await expect(
      saveUserPreferences('22222222-2222-4222-8222-222222222222', {} as any)
    ).rejects.toThrow('propre compte')
    expect(saveOnboardingDataMock).not.toHaveBeenCalled()
  })

  it('blocks legacy match acceptance for another account', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        role: 'user'
      }
    })

    const { acceptMatch } = await import('@/app/actions')

    await expect(
      acceptMatch(
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333'
      )
    ).rejects.toThrow('propre compte')
    expect(executeQueryMock).not.toHaveBeenCalled()
  })
})
