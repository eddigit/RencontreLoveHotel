import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('V3 visibility and conversation migration', () => {
  it('adds explicit access modes without destructive SQL', () => {
      const sql = readFileSync('migrations/20260710_v3_conversation_access.sql', 'utf8')

      expect(sql).toContain('BEGIN;')
      expect(sql).toContain('COMMIT;')
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS access_mode')
    expect(sql).toContain("'legacy_import'")
    expect(sql).toContain("'admin'")
    expect(sql).toContain('UPDATE conversations')
    expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM conversations|DELETE FROM messages/i)
  })
})
