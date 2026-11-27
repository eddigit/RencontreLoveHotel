import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member portrait visit rotation', () => {
  it('uses one server-generated visit seed for the initial portrait page and later pages', () => {
    const portraits = readFileSync('components/community-portraits.tsx', 'utf8')
    const track = readFileSync('components/member-portrait-track.tsx', 'utf8')
    const action = readFileSync('actions/member-portraits.ts', 'utf8')

    expect(portraits).toContain("import { randomUUID } from 'node:crypto'")
    expect(portraits).toContain('listMemberPortraits(viewerId, 0, visitSeed)')
    expect(portraits).toContain('<MemberPortraitTrack initial={members} visitSeed={visitSeed} />')
    expect(track).toContain('nextMemberPortraits(offset.current, visitSeed)')
    expect(action).toContain('listMemberPortraits(session.user.id, offset, visitSeed)')
  })

  it('keeps the visibility query authoritative while rotating only its tie order', () => {
    const portraits = readFileSync('lib/member-portraits.ts', 'utf8')

    expect(portraits).toContain('NOT EXISTS (')
    expect(portraits).toContain('u.admin_starred_at IS NOT NULL AND u.moderator_spotlight_at IS NOT NULL THEN 3')
    expect(portraits).toContain("md5(CONCAT(u.id::text, ':', $1::text, ':', $3::text))")
    expect(portraits).toContain('LIMIT 36 OFFSET $2')
  })
})
