import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const scannedRoots = ['app', 'components', 'styles']
const scannedExtensions = new Set(['.css', '.ts', '.tsx'])
const bannedGreyTokens = ['#3C3C3C', '3C3C3C', '#333333']

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    const stat = statSync(path)

    if (stat.isDirectory()) {
      return collectSourceFiles(path)
    }

    const extension = path.slice(path.lastIndexOf('.'))
    return scannedExtensions.has(extension) ? [path] : []
  })
}

describe('brand surface colors', () => {
  it('does not ship the muddy #3C3C3C family in app surfaces', () => {
    const offenders = scannedRoots
      .flatMap(collectSourceFiles)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8')
        return bannedGreyTokens
          .filter((token) => source.includes(token))
          .map((token) => `${file}: ${token}`)
      })

    expect(offenders).toEqual([])
  })
})
