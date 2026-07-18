import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'

describe('admin product activity UI', () => {
  it('shows the nine measured community workflows on the admin dashboard', () => {
    const dashboard = readFileSync('app/admin/page.tsx', 'utf8')
    const component = readFileSync('components/admin-product-activity.tsx', 'utf8')

    expect(dashboard).toContain('<AdminProductActivity />')
    expect(component).toContain('getProductActivitySummary')
    for (const label of [
      'Recherches', 'Profils consultés', 'Demandes de contact',
      'Matchs acceptés', 'Conversations lancées', 'Messages envoyés',
      'Événements créés', 'Participations', 'Annonces publiées'
    ]) {
      expect(component).toContain(label)
    }
  })
})
