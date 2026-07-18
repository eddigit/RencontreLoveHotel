import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('contact safety before message attachment upload', () => {
  it('checks the authenticated member filename before public or private storage', () => {
    const source = readFileSync('app/api/messages/attachments/route.ts', 'utf8')
    const enforcement = source.indexOf('await enforceMemberContent')
    const upload = source.indexOf('await put(')

    expect(source).toContain("surface: 'attachment_filename'")
    expect(source).toContain('actorUserId: String(user.id)')
    expect(enforcement).toBeGreaterThan(0)
    expect(upload).toBeGreaterThan(enforcement)
  })

  it('shows the stable safety explanation instead of a generic retry message', () => {
    const source = readFileSync('app/messages/[id]/page.tsx', 'utf8')
    expect(source).toContain('les coordonnées et moyens de contact externes ne peuvent pas être partagés')
  })
})
