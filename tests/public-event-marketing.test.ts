import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { isProtectedPagePath, isPublicPath } from '@/lib/route-access'

describe('public event acquisition', () => {
  it('opens event discovery while keeping creation and editing protected', () => {
    expect(isPublicPath('/events')).toBe(true)
    expect(isProtectedPagePath('/events')).toBe(false)
    expect(isPublicPath('/events/550e8400-e29b-41d4-a716-446655440001')).toBe(true)
    expect(isPublicPath('/events/new')).toBe(false)
    expect(isPublicPath('/events/edit')).toBe(false)
  })

  it('uses the supplied event campaign photography', () => {
    const events = readFileSync('app/events/page.tsx', 'utf8')
    const landing = readFileSync('app/landing-page.tsx', 'utf8')
    expect(events).toContain('/paris-event-limousine.png')
    expect(landing).toContain('/paris-event-masquerade.png')
  })

  it('does not present an illustrative portrait as a real named member', () => {
    const landing = readFileSync('app/landing-page.tsx', 'utf8')
    expect(landing).not.toContain("title: 'SOPHIA'")
    expect(landing).not.toContain('Sophia, membre')
  })
})
