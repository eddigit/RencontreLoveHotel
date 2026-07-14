import { existsSync, readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

function readWhenPresent(path: string) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

describe('unified public site shell', () => {
  it('provides one adaptive shell for every non-admin route', () => {
    const shellPath = 'components/site-shell.tsx'
    const shell = readWhenPresent(shellPath)

    expect(existsSync(shellPath)).toBe(true)
    expect(shell).toContain("pathname.startsWith('/admin')")
    expect(shell).toContain("label: 'Découvrir'")
    expect(shell).toContain("label: 'Messages'")
    expect(shell).toContain("label: 'Matchs'")
    expect(shell).toContain("label: 'Événements'")
    expect(shell).toContain("label: 'Conciergerie'")
    expect(shell).toContain("label: 'Profil'")
    expect(shell).toContain("label: 'Accueil'")
    expect(shell).toContain("label: 'Concept'")
    expect(shell).toContain("label: 'Rencontres'")
    expect(shell).toContain("label: 'Love Rooms'")
    expect(shell).toContain("label: 'Premium'")
    expect(shell).toContain('<BrandLogo')
    expect(shell).toContain("aria-current={active ? 'page' : undefined}")
  })

  it('renders the official logo without cropping it', () => {
    const logoPath = 'components/brand-logo.tsx'
    const logo = readWhenPresent(logoPath)

    expect(existsSync(logoPath)).toBe(true)
    expect(logo).toContain("src='/lhr-official-logo.png'")
    expect(logo).toContain('aspect-[1162/1354]')
    expect(logo).toContain('object-contain')
    expect(logo).not.toContain('object-cover')
  })

  it('mounts the shell globally and removes competing layout navigation', () => {
    const rootLayout = readFileSync('app/layout.tsx', 'utf8')
    const mainLayout = readFileSync('components/layout/main-layout.tsx', 'utf8')
    const v2Shell = readFileSync('components/lhr-v2-shell.tsx', 'utf8')

    expect(rootLayout).toContain("import { SiteShell } from '@/components/site-shell'")
    expect(rootLayout).toContain('<SiteShell>')
    expect(mainLayout).toContain("pathname.startsWith('/admin')")
    expect(mainLayout).toContain('return <>{children}</>')
    expect(mainLayout).toContain('<Header session={session} user={user} />')
    expect(v2Shell).not.toContain("<aside className='hidden")
    expect(v2Shell).not.toContain("src='/lhr-official-logo.png'")
  })
})
