import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(file, 'utf8')

describe('public positioning and authentication shell', () => {
  it('keeps authentication focused and removes unsupported commercial claims', () => {
    const shell = source('components/site-shell.tsx')
    const providers = source('components/providers.tsx')
    const commercial = [
      source('app/rencontres/page.tsx'),
      source('app/premium/page.tsx'),
      source('components/ConciergerieForm.tsx'),
      source('components/PreferencesEditor.tsx'),
      source('components/onboarding-form.tsx')
    ].join('\n').toLowerCase()

    expect(shell).toContain("'/login'")
    expect(shell).toContain("'/register'")
    expect(shell).toContain('publicStandaloneRoutes')
    expect(commercial).not.toContain('40k+')
    expect(commercial).not.toContain('40 000')
    expect(commercial).not.toContain('restaurant gastronomique')
    expect(commercial).not.toContain('partenariat loolyyb')
    expect(commercial).not.toContain('hôtel 4 étoiles')
    expect(commercial).not.toContain('restaurant du love hôtel')
    expect(commercial).not.toContain("value: 'restaurant'")
    expect(providers).not.toContain('LoolyyBWidget')
  })
})
