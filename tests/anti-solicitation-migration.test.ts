import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('anti-solicitation compliance migration', () => {
  const path = 'migrations/20260715_anti_solicitation_compliance.sql'
  const sql = existsSync(path) ? readFileSync(path, 'utf8') : ''

  it('stores versioned legal acceptance evidence', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS legal_acceptances')
    expect(sql).toContain('document_type')
    expect(sql).toContain('document_version')
    expect(sql).toContain('accepted_at')
  })

  it('extends moderation rules and cases without destroying existing data', () => {
    expect(sql).toContain('ALTER TABLE moderation_keywords')
    expect(sql).toContain('category')
    expect(sql).toContain('weight')
    expect(sql).toContain('policy_version')
    expect(sql).toContain('retention_until')
    expect(sql).not.toMatch(/DROP TABLE|TRUNCATE/i)
  })

  it('creates named access, human decisions and appeals', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS moderation_case_access')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS moderation_decisions')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS moderation_appeals')
    expect(sql).toContain('community_moderator')
    expect(sql).toContain("active BOOLEAN NOT NULL DEFAULT FALSE")
  })

  it('keeps production activation in a separate controlled migration', () => {
    const activationPath = 'migrations/20260715_activate_anti_solicitation_rules.sql'
    const activation = existsSync(activationPath) ? readFileSync(activationPath, 'utf8') : ''
    expect(activation).toContain("policy_version = 'anti-solicitation-2026-07-15'")
    expect(activation).toContain('SET active = true')
  })

  it('provides a non-destructive rule deactivation rollback', () => {
    const rollbackPath = 'migrations/20260715_deactivate_anti_solicitation_rules.sql'
    const rollback = existsSync(rollbackPath) ? readFileSync(rollbackPath, 'utf8') : ''
    expect(rollback).toContain('SET active = false')
    expect(rollback).toContain("anti-solicitation-2026-07-15")
    expect(rollback).not.toMatch(/DROP TABLE|TRUNCATE/i)
  })
})
