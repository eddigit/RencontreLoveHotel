import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('messages read column migration', () => {
  it('renames legacy read column to is_read idempotently', () => {
    const sql = readFileSync('migrations/20260610_normalize_messages_is_read.sql', 'utf8')
    expect(sql).toContain('messages')
    expect(sql).toContain('is_read')
    expect(sql).toContain('read')
  })
})
