import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const layoutSource = readFileSync(join(process.cwd(), 'app/admin/users/layout.tsx'), 'utf8')

describe('admin users cache policy', () => {
  it('keeps the protected directory dynamic and out of shared caches', () => {
    expect(layoutSource).toContain("dynamic = 'force-dynamic'")
    expect(layoutSource).toContain('revalidate = 0')
    expect(layoutSource).toContain("fetchCache = 'force-no-store'")
  })
})
