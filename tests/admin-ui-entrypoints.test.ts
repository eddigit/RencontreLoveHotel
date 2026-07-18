import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('admin notifications email moderation UI entrypoints', () => {
  it('adds email and moderation tabs to the admin navigation', () => {
    const source = readFileSync('components/admin-tabs.tsx', 'utf8')

    expect(source).toContain("href: '/admin/email-campaigns'")
    expect(source).toContain("href: '/admin/internal-messages'")
    expect(source).toContain("href: '/admin/moderation'")
    expect(source).toContain("label: 'Emails'")
    expect(source).toContain("label: 'Messages internes'")
    expect(source).toContain("label: 'Modération'")
  })

  it('protects the email campaigns admin page', () => {
    const source = readFileSync('app/admin/email-campaigns/page.tsx', 'utf8')

    expect(source).toContain("<ProtectedRoute allowedRoles={['admin']}>")
    expect(source).toContain('Campagnes email')
    expect(source).toContain('Preparer les destinataires')
  })

  it('protects the moderation admin page', () => {
    const source = readFileSync('app/admin/moderation/page.tsx', 'utf8')

    expect(source).toContain("<ProtectedRoute allowedRoles={['admin']}>")
    expect(source).toContain('Centre de modération')
    expect(source).toContain("href='/moderation'")
    expect(source).toContain('Scanner les messages')
  })

  it('protects the admin options page', () => {
    const source = readFileSync('app/admin/options/page.tsx', 'utf8')

    expect(source).toContain("<ProtectedRoute allowedRoles={['admin']}>")
    expect(source).toContain("Paramètres de l'application")
  })

  it('protects the internal messages admin page', () => {
    const source = readFileSync('app/admin/internal-messages/page.tsx', 'utf8')

    expect(source).toContain("<ProtectedRoute allowedRoles={['admin']}>")
    expect(source).toContain('Messages internes')
    expect(source).toContain('sendInternalMessageToAllUsers')
  })

  it('labels rolling dashboard KPIs with their explicit 24-hour window', () => {
    const source = readFileSync('components/admin-real-time-stats.tsx', 'utf8')

    expect(source).toContain('Activité sur 24 h')
    expect(source).toContain('Actifs sur 24 h')
    expect(source).not.toContain('Activité Récente (24h)')
  })
})
