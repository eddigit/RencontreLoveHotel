import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('message delivery receipt migration', () => {
  it('adds a nullable delivery timestamp independently of read state', () => {
    const sql = readFileSync('migrations/20261127_message_delivery_receipts.sql', 'utf8')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS delivered_at')
    expect(sql).not.toContain('is_read = true')
  })
})
