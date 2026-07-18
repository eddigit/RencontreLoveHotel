import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function expectBefore(source: string, enforcementNeedle: string, persistenceNeedle: string) {
  const enforcement = source.indexOf(enforcementNeedle)
  const persistence = source.indexOf(persistenceNeedle)
  expect(enforcement).toBeGreaterThan(0)
  expect(persistence).toBeGreaterThan(enforcement)
}

describe('contact safety on member-authored public surfaces', () => {
  it('checks profile free text before profile persistence', () => {
    const source = readFileSync('app/profile/page.tsx', 'utf8')
    expect(source).toContain("surface: 'profile'")
    expectBefore(source, 'await enforceMemberContent', '// Update user table')
  })

  it('checks wall posts before upload and comments before insert', () => {
    const source = readFileSync('actions/community-wall-actions.ts', 'utf8')
    expect(source).toContain("surface: 'wall_post'")
    expect(source).toContain("surface: 'wall_comment'")
    expectBefore(source, "surface: 'wall_post'", 'const blob = await put(')
    expectBefore(source, "surface: 'wall_comment'", 'INSERT INTO wall_comments')
  })

  it('checks member events while preserving official admin content', () => {
    const source = readFileSync('actions/event-actions.ts', 'utf8')
    expect(source).toContain("surface: 'member_event'")
    expect(source).toContain("currentUser.role !== 'admin'")
    expectBefore(source, "surface: 'member_event'", 'INSERT INTO events')
  })
})
