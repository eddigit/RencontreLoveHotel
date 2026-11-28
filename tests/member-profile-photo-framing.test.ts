import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile photo framing', () => {
  it('uses a face-focused circular crop at every breakpoint', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')

    expect(page).toContain("aspect-square w-20")
    expect(page).toContain('rounded-full')
    expect(page).toContain('object-cover object-[center_35%]')
    expect(page).toContain('h-full w-full rounded-full object-cover object-[center_35%]')
    expect(page).not.toContain("absolute inset-x-0 bottom-0")
  })
})
