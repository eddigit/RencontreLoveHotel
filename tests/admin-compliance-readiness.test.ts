import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('admin compliance readiness', () => {
  it('loads readiness only through an authenticated server action', () => {
    const action = read('actions/compliance-admin-actions.ts')
    expect(action).toContain('await requireAdmin()')
    expect(action).toContain('getLegalReadiness()')
    expect(action).toContain('getComplianceFlags()')
  })

  it('shows statuses and missing field names without rendering environment values', () => {
    const component = read('components/admin/compliance-readiness.tsx')
    expect(component).toContain('Paiement bloqué tant que la configuration juridique est incomplète')
    expect(component).toContain('Fonctions désactivées par défaut')
    expect(component).toContain('missingPaymentFields')
    expect(component).not.toContain('process.env')
    expect(component).not.toContain('LEGAL_AUDIT_HMAC_SECRET')
  })

  it('is visible on the protected admin dashboard', () => {
    const dashboard = read('app/admin/page.tsx')
    expect(dashboard).toContain('ComplianceReadiness')
  })
})
