import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { OPERATIONAL_CONTACT_EMAIL } from '@/lib/operational-contact'

describe('LHR operational contact governance', () => {
  it('routes non-legal operations to the requested contact', () => {
    expect(OPERATIONAL_CONTACT_EMAIL).toBe('loolyyb@gmail.com')
    expect(readFileSync('app/api/conciergerie/route.ts', 'utf8')).toContain('getConciergerieRecipientEmail')
  })

  it('promotes the operational account without changing legal identity', () => {
    const migration = readFileSync('migrations/20260715_operational_admin.sql', 'utf8')
    expect(migration).toContain("LOWER(email) = 'loolyyb@gmail.com'")
    expect(migration).toContain("SET role = 'admin'")

    const terms = readFileSync('app/terms/page.tsx', 'utf8')
    expect(terms).toContain('lovehotelaparis@gmail.com')
    expect(terms).not.toContain('loolyyb@gmail.com')
  })
})
