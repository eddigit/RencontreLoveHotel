import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('official LHR logo', () => {
  it('is stored locally and used by member navigation only', () => {
    expect(existsSync(join(root, 'public/lhr-official-logo.png'))).toBe(true)

    const shell = readFileSync(join(root, 'components/lhr-v2-shell.tsx'), 'utf8')
    const header = readFileSync(join(root, 'components/header.tsx'), 'utf8')

    expect(shell).toContain('/lhr-official-logo.png')
    expect(shell).toContain("sizes='208px'")
    expect(header).toContain('Love Hotel rencontre')
  })
})
