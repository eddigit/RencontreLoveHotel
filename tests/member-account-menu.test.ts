import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member account navigation', () => {
  it('offers profile, email preferences and logout from the account menu', () => {
    const menu = readFileSync('components/member-account-menu.tsx', 'utf8')

    expect(menu).toContain('Mon profil')
    expect(menu).toContain('/email-preferences')
    expect(menu).toContain('Se déconnecter')
    expect(menu).toContain('logout()')
  })

  it('anchors the account menu in desktop and mobile navigation', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const mobile = readFileSync('components/mobile-navigation.tsx', 'utf8')

    expect(shell).toContain("href='/profile'")
    expect(shell).not.toContain('Beta V2')
    expect(mobile).toContain("variant='mobile'")
    expect(readFileSync('components/member-account-menu.tsx', 'utf8')).toContain(
      'Compte'
    )
  })

  it('fits all six mobile navigation actions inside the viewport', () => {
    const mobile = readFileSync('components/mobile-navigation.tsx', 'utf8')
    const menu = readFileSync('components/member-account-menu.tsx', 'utf8')

    expect(mobile).toContain("<nav className='grid grid-cols-6")
    expect(mobile).toContain('min-w-0')
    expect(mobile).toContain('px-1')
    expect(menu).toContain('w-full')
  })

  it('keeps the desktop sidebar and account control inside the viewport', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')

    expect(shell).toContain("<aside className='sticky")
    expect(shell).toContain('h-screen')
    expect(shell).toContain("<nav className='space-y-2'")
    expect(shell).toContain("className='mt-auto")
  })

  it('does not create a containing block around the fixed mobile navigation', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const mainClasses = shell.match(/<main className='([^']+)'/)?.[1]

    expect(mainClasses).toBeDefined()
    expect(mainClasses).not.toContain('backdrop-blur')
  })
})
