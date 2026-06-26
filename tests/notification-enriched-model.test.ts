import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('enriched notification model', () => {
  it('loads priority, category, audience and read timestamps from notification queries', () => {
    const source = readFileSync('app/actions.ts', 'utf8')

    expect(source).toContain('priority, category, audience, metadata, read_at')
    expect(source).toContain('expires_at IS NULL OR expires_at > NOW()')
    expect(source).toContain('read_at = COALESCE(read_at, CURRENT_TIMESTAMP)')
  })

  it('surfaces urgent and admin notification state in the dropdown UI', () => {
    const source = readFileSync('components/notifications-dropdown.tsx', 'utf8')

    expect(source).toContain('urgentCount')
    expect(source).toContain('notification.audience === "admin"')
    expect(source).toContain('notification.priority === "critical"')
  })
})
