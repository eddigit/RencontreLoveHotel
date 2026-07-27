import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile photo framing', () => {
  it('shows the complete portrait without cropping or covering it with profile text', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')

    expect(page).toContain("aspect-[4/5]")
    expect(page).toContain("className='object-contain'")
    expect(page).toContain("h-full w-full object-contain")
    expect(page).not.toContain("absolute inset-x-0 bottom-0")
    expect(page).not.toContain("className='object-cover'")
  })
})
