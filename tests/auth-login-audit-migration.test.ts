import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('authentication login audit migration', () => {
  it('creates the login event indexes without sensitive fields', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'migrations/20260714_auth_login_audit.sql'),
      'utf8'
    )

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS auth_logs')
    expect(migration).toContain('idx_auth_logs_event_created')
    expect(migration).toContain('idx_auth_logs_email_created')
    expect(migration).not.toContain('password_hash')
    expect(migration).not.toContain('access_token')
    expect(migration).not.toMatch(/secret\s+(TEXT|VARCHAR)/i)
  })
})
