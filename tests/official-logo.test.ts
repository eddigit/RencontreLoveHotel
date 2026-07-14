import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('official LHR logo', () => {
  it('is stored locally and displayed without cropping in the global shell', () => {
    expect(existsSync(join(root, 'public/lhr-official-logo.png'))).toBe(true)

    const logo = readFileSync(join(root, 'components/brand-logo.tsx'), 'utf8')
    const shell = readFileSync(join(root, 'components/site-shell.tsx'), 'utf8')

    expect(logo).toContain('/lhr-official-logo.png')
    expect(logo).toContain('object-contain')
    expect(logo).not.toContain('object-cover')
    expect(logo).toContain('Love Hotel Rencontre')
    expect(shell).toContain('<BrandLogo')
  })
})
