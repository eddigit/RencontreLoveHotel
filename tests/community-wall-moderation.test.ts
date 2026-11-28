import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ sql: { query: vi.fn() } }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser: vi.fn(async () => ({ id: 'member-1', role: 'user' })) }))
vi.mock('@/lib/content-safety-service', () => ({ enforceMemberContent: vi.fn() }))
vi.mock('@/lib/image-upload-validation', () => ({ validateImageFile: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn() }))

import { addWallComment } from '@/actions/community-wall-actions'
import { sql } from '@/lib/db'

const query = sql.query as any
const rule = (id: string, keyword: string, weight: number, phrase = false) => ({
  id, keyword, weight, phrase, category: 'general', active: true
})
const rules = [
  rule('r-roses', 'roses', 2),
  rule('r-genereux', 'généreux', 2),
  rule('r-euros', 'euros', 1),
  rule('r-escort', 'escort', 6)
]

async function comment(body: string) {
  query.mockReset()
  query
    .mockResolvedValueOnce([{ count: 0 }]) // hourly limit
    .mockResolvedValueOnce([{ id: 'post-1', status: 'active' }])
    .mockResolvedValueOnce(rules)
    .mockImplementationOnce(async (_sql: string, params: unknown[]) => [{ id: 'comment-1', status: params[3] }])
    .mockResolvedValue([])
  const result = await addWallComment({ postId: 'post-1', body })
  const queued = query.mock.calls.find(([text]: [string]) => text.includes('INSERT INTO moderation_queue'))
  return { result, queued }
}

beforeEach(() => query.mockReset())

describe('wall moderation uses the weighted scale of private messages', () => {
  it('publishes a comment containing a single low-weight word', async () => {
    const { result, queued } = await comment('Un bouquet de roses pour la soirée')
    expect(result.status).toBe('active')
    expect(queued).toBeUndefined()
  })

  it('does not match a keyword inside a longer word', async () => {
    const { result, queued } = await comment('Des soirées moroses, 20 euros le taxi')
    expect(result.status).toBe('active')
    expect(queued).toBeUndefined()
  })

  it('hides and queues a comment whose weights reach the alert threshold', async () => {
    const { result, queued } = await comment('Homme généreux, 200 roses')
    expect(result.status).toBe('hidden')
    expect(queued[1][5]).toEqual(['roses', 'généreux'])
    expect(queued[1][3]).toBe('medium')
  })

  it('hides a comment with a single heavy keyword, plural included', async () => {
    const { result, queued } = await comment('Escorts disponibles ce soir')
    expect(result.status).toBe('hidden')
    expect(queued[1][3]).toBe('high')
  })
})
