import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile mobile layout', () => {
  it('keeps identity and contact action independent on narrow screens', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')

    expect(page).toContain('flex min-w-0 whitespace-nowrap text-xl')
    expect(page).toContain("<span className='shrink-0'>")
    expect(page).toContain('min-h-11 w-full items-center justify-center')
    expect(page).toContain('sm:w-auto')
  })

  it('keeps profile sections scrollable and categories readable at 320px', () => {
    const page = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    const categories = readFileSync('components/meeting-categories.tsx', 'utf8')

    expect(page).toContain('flex-nowrap gap-1 overflow-x-auto')
    expect(page).toContain('[&_a]:shrink-0')
    expect(categories).toContain('grid-cols-1 gap-2 min-[360px]:grid-cols-2')
  })
})
