import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('premium event visuals', () => {
  it('uses the supplied Paris event photography across event discovery', () => {
    const landing = readFileSync('app/landing-page.tsx', 'utf8')
    const eventsPage = readFileSync('app/events/page.tsx', 'utf8')
    const presentation = readFileSync('lib/event-presentation.ts', 'utf8')

    expect(existsSync('public/paris-event-limousine.png')).toBe(true)
    expect(existsSync('public/paris-event-masquerade.png')).toBe(true)
    expect(landing).toContain('/paris-event-limousine.png')
    expect(landing).toContain('/paris-event-masquerade.png')
    expect(eventsPage).toContain('/paris-event-limousine.png')
    expect(presentation).toContain("default: '/paris-event-masquerade.png'")
  })
})
