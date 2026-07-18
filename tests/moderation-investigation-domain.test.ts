import { describe, expect, it } from 'vitest'
import {
  getInitials,
  inferInvestigationCategory,
  investigationPriority
} from '@/lib/moderation-investigation'

describe('moderation investigation domain', () => {
  it('prioritizes prostitution and paid solicitation first', () => {
    expect(inferInvestigationCategory('prestation sexuelle contre argent')).toBe('paid_solicitation')
    expect(investigationPriority('paid_solicitation')).toBeGreaterThan(investigationPriority('fraud'))
  })

  it('distinguishes danger, harassment, fraud and fallback', () => {
    expect(inferInvestigationCategory('suspicion de profil mineur')).toBe('safety')
    expect(inferInvestigationCategory('menaces et harcèlement')).toBe('harassment')
    expect(inferInvestigationCategory('arnaque au paiement')).toBe('fraud')
    expect(inferInvestigationCategory('contenu inadapté')).toBe('other')
  })

  it('provides an avatar fallback without exposing an email', () => {
    expect(getInitials('Alice Martin')).toBe('AM')
    expect(getInitials('Membre-12345678')).toBe('M1')
  })
})
