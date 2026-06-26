import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('admin options modern UI', () => {
  it('rebuilds the application settings page as a scalable admin console', () => {
    const source = readFileSync('app/admin/options/page.tsx', 'utf8')

    expect(source).toContain('Console de configuration')
    expect(source).toContain('Événements activés')
    expect(source).toContain('Emails transactionnels')
    expect(source).toContain('Conciergerie & premium')
    expect(source).toContain('Sécurité & maintenance')
    expect(source).toContain('Aperçu de livraison')
    expect(source).toContain('Sauvegarder la configuration')
    expect(source).not.toContain('max-w-xl')
  })

  it('keeps only the active Love Hotel event categories editable', () => {
    const source = readFileSync('app/admin/options/page.tsx', 'utf8')

    expect(source).toContain('activeEventCategoryValues')
    expect(source).toContain('jacuzzi|Apéro jacuzzi 2 à 4 couples')
    expect(source).toContain('open_curtains|Rideaux ouverts 2 ou 3 chambres')
    expect(source).toContain('Restaurant et bar restent en standby')
    expect(source).not.toContain('speed-dating|Speed Dating')
  })
})
