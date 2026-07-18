import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('moderation investigation cockpit migration', () => {
  const sql = readFileSync('migrations/20260718_moderation_investigation_cockpit.sql', 'utf8')

  it('creates one durable investigation per reported member', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS moderation_investigations')
    expect(sql).toContain('subject_user_id UUID NOT NULL')
    expect(sql).toContain('enhanced_access_until')
    expect(sql).toContain('UNIQUE (subject_user_id)')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS investigation_id')
  })

  it('separates official messages, evidence, exports and transmissions', () => {
    for (const table of [
      'moderation_official_messages',
      'moderation_investigation_events',
      'moderation_evidence_snapshots',
      'moderation_exports',
      'moderation_transmissions'
    ]) expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    expect(sql).toContain('SHA-256')
  })

  it('attaches both automated and member-reported alerts to a durable investigation', () => {
    expect(readFileSync('lib/moderation-case-service.ts', 'utf8')).toContain('moderation_investigations')
    expect(readFileSync('actions/member-safety-actions.ts', 'utf8')).toContain('moderation_investigations')
  })
})
