import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : ''

describe('focused moderation UI', () => {
  it('removes normal bulk scanning and raw message browsing from admin entrypoint', () => {
    const admin = read('app/admin/moderation/page.tsx')
    expect(admin).not.toContain('scanRecentMessagesForModeration')
    expect(admin).not.toContain("href='/admin/messages'")
    expect(admin).toContain("href='/moderation'")
  })

  it('provides a case-only queue for named community moderators', () => {
    const queue = read('app/moderation/page.tsx')
    expect(queue).toContain("allowedRoles={['admin', 'community_moderator']}")
    expect(queue).toContain('Dossiers ciblés uniquement')
    expect(queue).toContain('getModerationCases')
    expect(read('app/admin/users/[id]/edit/page.tsx')).toContain('Adhérent-modérateur')
  })

  it('provides human decisions and a member appeal surface', () => {
    expect(read('app/moderation/[id]/page.tsx')).toContain('createModerationDecision')
    expect(read('app/account/appeals/page.tsx')).toContain('submitModerationAppeal')
    expect(read('app/account/appeals/page.tsx')).toContain('Réexamen humain')
  })
})
