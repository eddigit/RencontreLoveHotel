import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('event cover upload route', () => {
  it('uses the authenticated image validation and event cover storage path', () => {
    const route = readFileSync('app/api/events/upload-cover/route.ts', 'utf8')

    expect(route).toContain('getServerSession')
    expect(route).toContain('validateImageFile')
    expect(route).toContain("event-covers/${user.id}/")
    expect(route).toContain("access: 'public'")
    expect(route).not.toContain('INSERT INTO photos')
  })
})
