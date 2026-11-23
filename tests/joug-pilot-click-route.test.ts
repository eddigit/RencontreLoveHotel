import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getServerSession, query, isJougPilotActive } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  query: vi.fn(),
  isJougPilotActive: vi.fn()
}))

vi.mock('next-auth/next', () => ({ getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ sql: { query } }))
vi.mock('@/lib/joug-pilot', () => ({ isJougPilotActive }))

import { POST } from '@/app/api/joug-pilot/click/route'

describe('Joug pilot aggregate click counter', () => {
  beforeEach(() => {
    getServerSession.mockReset()
    query.mockReset()
    isJougPilotActive.mockReset()
  })

  it('increments only the aggregate daily counter for an authenticated voluntary click', async () => {
    isJougPilotActive.mockReturnValue(true)
    getServerSession.mockResolvedValue({ user: { id: 'member-123' } })
    query.mockResolvedValue([])

    const response = await POST()

    expect(response.status).toBe(204)
    expect(query).toHaveBeenCalledTimes(1)
    const statement = query.mock.calls[0][0]
    expect(statement).toContain('joug_pilot_daily_clicks')
    expect(statement).toContain('ON CONFLICT')
    expect(statement).not.toContain('member-123')
  })

  it('does not count outside the active window', async () => {
    isJougPilotActive.mockReturnValue(false)

    const response = await POST()

    expect(response.status).toBe(204)
    expect(getServerSession).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
  })
})
