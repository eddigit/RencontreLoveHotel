import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('LHR fluid layout', () => {
  const shell = fs.readFileSync(path.join(process.cwd(), 'components/site-shell.tsx'), 'utf8')
  const header = fs.readFileSync(path.join(process.cwd(), 'components/header.tsx'), 'utf8')

  it('uses the available viewport width in the modern app shell', () => {
    expect(shell).toContain('site-shell')
    expect(shell).toContain('lg:grid-cols-[220px_minmax(0,1fr)]')
    expect(shell).toContain('max-w-[1920px]')
    expect(shell).not.toContain('lg:grid-cols-[248px_minmax(0,1fr)]')
    expect(shell).not.toContain('lg:px-7')
  })

  it('does not center the authenticated header in a narrow container', () => {
    expect(header).toContain('w-full px-4 sm:px-5 lg:px-6')
    expect(header).not.toContain("className='container flex items-center justify-between h-16'")
  })
})
