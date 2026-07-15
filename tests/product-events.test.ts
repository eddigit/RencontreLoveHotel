import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/db', () => ({ sql: { query } }))

import {
  sanitizeProductMetadata,
  trackProductEvent
} from '@/lib/product-events'

describe('privacy-safe product events', () => {
  beforeEach(() => query.mockReset())

  it('keeps bounded categorical metrics and drops private or nested values', () => {
    expect(sanitizeProductMetadata({
      batch: 2,
      surface: 'community',
      successful: true,
      content: 'message secret',
      email: 'member@example.com',
      bio: 'private biography',
      location: 'exact address',
      nested: { secret: true },
      veryLong: 'x'.repeat(200)
    })).toEqual({
      batch: 2,
      surface: 'community',
      successful: true
    })
  })

  it('inserts allowlisted events without making missing schema fatal', async () => {
    query.mockResolvedValueOnce([])
    await expect(trackProductEvent({
      eventName: 'profile_impression',
      userId: '11111111-1111-4111-8111-111111111111',
      subjectId: '22222222-2222-4222-8222-222222222222',
      metadata: { surface: 'community' }
    })).resolves.toBeUndefined()

    query.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: '42P01' }))
    await expect(trackProductEvent({ eventName: 'message_sent' })).resolves.toBeUndefined()
  })
})
