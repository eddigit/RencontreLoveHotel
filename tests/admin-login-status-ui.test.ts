import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('admin login status UI', () => {
  it('shows separate administrator and user connection indicators', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'components/admin-login-status.tsx'),
      'utf8'
    )

    expect(source).toContain('État des connexions')
    expect(source).toContain('Administrateurs')
    expect(source).toContain('Utilisateurs')
    expect(source).toContain('En ligne')
    expect(source).toContain('Connexions 24 h')
    expect(source).toContain('Échecs 24 h')
    expect(source).toContain('Dernières connexions')
  })

  it('renders the connection status on the admin dashboard', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/admin/page.tsx'),
      'utf8'
    )

    expect(source).toContain("import { AdminLoginStatus } from '@/components/admin-login-status'")
    expect(source).toContain('<AdminLoginStatus />')
  })
})
