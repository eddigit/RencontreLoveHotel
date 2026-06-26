import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const poolConstructorMock = vi.fn(() => ({ query: queryMock }))

vi.mock('dotenv', () => ({
  config: vi.fn()
}))

vi.mock('pg', () => ({
  Pool: poolConstructorMock
}))

describe('PostgreSQL database client', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.DATABASE_URL = 'postgresql://lhr:secret@vps2.local:5432/lhr'
    delete process.env.POSTGRES_URL
  })

  it('uses a standard PostgreSQL pool instead of Neon', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ok: true }] })

    const { executeQuery } = await import('../lib/db')
    const result = await executeQuery('SELECT $1::boolean AS ok', [true])

    expect(poolConstructorMock).toHaveBeenCalledWith({
      connectionString: 'postgresql://lhr:secret@vps2.local:5432/lhr',
      ssl: false
    })
    expect(queryMock).toHaveBeenCalledWith('SELECT $1::boolean AS ok', [true])
    expect(result).toEqual([{ ok: true }])
  })

  it('supports tagged-template SQL with positional parameters', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })

    const { sql } = await import('../lib/db')
    const result = await sql`SELECT id FROM users WHERE email = ${'a@b.test'} AND role = ${'admin'}`

    expect(queryMock).toHaveBeenCalledWith(
      'SELECT id FROM users WHERE email = $1 AND role = $2',
      ['a@b.test', 'admin']
    )
    expect(result).toEqual([{ id: 'user-1' }])
  })
})
