import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('profile report moderation UI', () => {
  const page = readFileSync('app/admin/moderation/page.tsx', 'utf8')
  const actions = readFileSync('actions/admin-moderation-actions.ts', 'utf8')

  it('shows reported and reporter profile links in a dedicated queue', () => {
    expect(page).toContain('Signalements de profils')
    expect(page).toContain('href={`/profile/${item.reported_user_id}`}')
    expect(page).toContain('href={`/profile/${item.reporter_id}`}')
    expect(page).toContain('getProfileReportQueue')
  })

  it('keeps global sanctions as an explicit separate admin decision', () => {
    expect(actions).toContain('export async function resolveProfileReport')
    expect(actions).toContain('await requireAdmin()')
    expect(actions).not.toContain("UPDATE users SET status = 'banned'")
    expect(page).toContain('Aucun bannissement automatique')
  })
})
