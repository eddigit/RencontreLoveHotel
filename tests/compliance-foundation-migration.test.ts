import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath = 'migrations/20260718_compliance_foundation.sql'

describe('compliance foundation migration', () => {
  it('creates additive audit and safety event tables without raw content storage', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS compliance_audit_log')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS compliance_safety_events')
    expect(sql).toContain('previous_hash CHAR(64)')
    expect(sql).toContain('entry_hash CHAR(64) NOT NULL')
    expect(sql).toContain('content_hmac CHAR(64) NOT NULL')
    expect(sql).toContain('masked_excerpt TEXT')
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN)/i)

    const safetyTable = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS compliance_safety_events'),
      sql.indexOf(');', sql.indexOf('CREATE TABLE IF NOT EXISTS compliance_safety_events'))
    )
    expect(safetyTable).not.toMatch(/\b(content|message|email|phone)\s+(TEXT|JSONB)/i)
  })

  it('adds explicit scope justification fields to moderation access records', () => {
    const sql = readFileSync(migrationPath, 'utf8')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS access_reason TEXT')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS scope_basis TEXT')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS authorized_by UUID')
    expect(sql).toContain('idx_compliance_safety_actor_created')
    expect(sql).toContain('idx_compliance_audit_entity')
  })

  it('keeps the canonical schema aligned with the migration', () => {
    const schema = readFileSync('schema.sql', 'utf8')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS compliance_audit_log')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS compliance_safety_events')
    expect(schema).toContain('ADD COLUMN IF NOT EXISTS access_reason TEXT')
  })
})
