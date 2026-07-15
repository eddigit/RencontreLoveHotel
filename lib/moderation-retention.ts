import type { ModerationOutcome } from '@/lib/anti-solicitation-policy'

export function retentionDaysForOutcome(outcome: ModerationOutcome) {
  return outcome === 'allow' || outcome === 'warn' ? 90 : 365
}

export function buildModerationCleanupQuery(execute: boolean) {
  const predicate = `legal_hold = false
    AND retention_until IS NOT NULL
    AND retention_until < NOW()`
  return execute
    ? `DELETE FROM moderation_queue WHERE ${predicate} RETURNING id`
    : `SELECT id FROM moderation_queue WHERE ${predicate} ORDER BY retention_until ASC`
}
