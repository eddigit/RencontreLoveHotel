import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('Vercel install configuration', () => {
  it('uses npm on Vercel to match the package manager declared by the app', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8'))

    expect(packageJson.packageManager).toMatch(/^npm@/)
    expect(vercelConfig.installCommand).toBe('npm install --legacy-peer-deps')
    expect(vercelConfig.buildCommand).toBe('npm run build')
  })
})
