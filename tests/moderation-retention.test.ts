import { describe, expect, it } from 'vitest'
import { buildModerationCleanupQuery, retentionDaysForOutcome } from '@/lib/moderation-retention'

describe('moderation evidence retention', () => {
  it('uses 90 days for no-action and warning-only cases', () => {
    expect(retentionDaysForOutcome('allow')).toBe(90)
    expect(retentionDaysForOutcome('warn')).toBe(90)
  })

  it('uses 12 months for restrictions and sanctions', () => {
    expect(retentionDaysForOutcome('hold')).toBe(365)
    expect(retentionDaysForOutcome('restrict')).toBe(365)
  })

  it('excludes legal holds and returns identifiers rather than evidence', () => {
    const query = buildModerationCleanupQuery(false)
    expect(query).toContain('legal_hold = false')
    expect(query).toContain('retention_until < NOW()')
    expect(query).toContain('SELECT id')
    expect(query).not.toContain('excerpt')
    expect(query).not.toContain('email')
  })

  it('requires the explicit execute path for deletion', () => {
    expect(buildModerationCleanupQuery(false)).not.toContain('DELETE FROM moderation_queue')
    expect(buildModerationCleanupQuery(true)).toContain('DELETE FROM moderation_queue')
  })
})
