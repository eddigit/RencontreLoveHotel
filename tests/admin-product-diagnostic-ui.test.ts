import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('admin product diagnostic cockpit UI', () => {
  it('adds the diagnostic cockpit to admin navigation', () => {
    const source = readFileSync('components/admin-tabs.tsx', 'utf8')
    expect(source).toContain("href: '/admin/diagnostic'")
    expect(source).toContain("label: 'Diagnostic'")
  })

  it('protects and renders the LHR diagnostic route', () => {
    const page = readFileSync('app/admin/diagnostic/page.tsx', 'utf8')
    const component = readFileSync('components/admin-product-diagnostic.tsx', 'utf8')

    expect(page).toContain("<ProtectedRoute allowedRoles={['admin']}>")
    expect(component).toContain('Cockpit Produit & Croissance LHR')
    expect(component).toContain("Plan d'action priorisé")
    expect(component).toContain('Créer les profils privés manquants')
    expect(component).toContain('État des migrations')
  })
})
