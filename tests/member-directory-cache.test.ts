import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const layoutSource = readFileSync(join(process.cwd(), 'app/members/layout.tsx'), 'utf8')

describe('member directory cache policy', () => {
  it('keeps the authenticated member directory dynamic', () => {
    expect(layoutSource).toContain("dynamic = 'force-dynamic'")
    expect(layoutSource).toContain('revalidate = 0')
    expect(layoutSource).toContain("fetchCache = 'force-no-store'")
  })
})
