import { beforeEach, describe, expect, it, vi } from 'vitest'
const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/db', () => ({ sql: { query } }))
import { getJougPilotConfig } from '@/lib/joug-pilot'

describe('Joug.World pilot configuration', () => {
  beforeEach(() => query.mockReset())
  it('stays hidden when launch dates have not been configured', async () => {
    query.mockResolvedValue([])
    await expect(getJougPilotConfig()).resolves.toMatchObject({ state: 'disabled' })
  })

  it('is active only during a 30-day launch window', async () => {
    query.mockResolvedValue([{ starts_at: '2026-12-01T10:00:00.000Z', ends_at: '2026-12-31T10:00:00.000Z' }])
    await expect(getJougPilotConfig(new Date('2026-12-15T10:00:00.000Z'))).resolves.toMatchObject({ state: 'active' })
    await expect(getJougPilotConfig(new Date('2026-12-31T10:00:00.000Z'))).resolves.toMatchObject({ state: 'expired' })
  })

  it('computes expiration exactly 30 days after launch', async () => {
    query.mockResolvedValue([{ starts_at: '2026-12-01T10:00:00.000Z', ends_at: '2026-12-31T10:00:00.000Z' }])
    await expect(getJougPilotConfig(new Date('2026-12-31T09:59:59.000Z'))).resolves.toMatchObject({ state: 'active' })
    await expect(getJougPilotConfig(new Date('2026-12-31T10:00:00.000Z'))).resolves.toMatchObject({ state: 'expired' })
  })
})
