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
    const shell = readFileSync('components/lhr-v2-shell.tsx', 'utf8')
    const mobile = readFileSync('components/mobile-navigation.tsx', 'utf8')

    expect(shell).toContain('<MemberAccountMenu')
    expect(shell).not.toContain('Beta V2')
    expect(mobile).toContain("variant='mobile'")
    expect(readFileSync('components/member-account-menu.tsx', 'utf8')).toContain(
      'Compte'
    )
  })
})
