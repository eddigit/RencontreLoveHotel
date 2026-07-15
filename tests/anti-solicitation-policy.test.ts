import { describe, expect, it } from 'vitest'
import {
  evaluateAntiSolicitation,
  type ModerationPolicyRule
} from '@/lib/anti-solicitation-policy'

const rules: ModerationPolicyRule[] = [
  { id: 'price', keyword: 'tarif', category: 'price', weight: 1, phrase: false, active: true },
  { id: 'gift', keyword: 'cadeau', category: 'benefit', weight: 1, phrase: false, active: true },
  { id: 'cash', keyword: 'cash', category: 'payment', weight: 2, phrase: false, active: true },
  { id: 'external', keyword: 'whatsapp', category: 'external_contact', weight: 2, phrase: false, active: true },
  { id: 'exchange', keyword: 'contre rémunération', category: 'exchange', weight: 5, phrase: true, active: true },
  { id: 'sexual', keyword: 'service sexuel', category: 'sexual_service', weight: 6, phrase: true, active: true }
]

describe('contextual anti-solicitation policy', () => {
  it('allows an isolated ambiguous term without retaining a case', () => {
    expect(evaluateAntiSolicitation('J’ai un cadeau pour ton anniversaire', rules)).toMatchObject({
      outcome: 'allow',
      score: 1,
      matchedCategories: ['benefit']
    })
  })

  it('normalizes accents, casing and whitespace for strong phrases', () => {
    expect(evaluateAntiSolicitation('SERVICE   SEXUEL contre RÉMUNÉRATION', rules)).toMatchObject({
      outcome: 'restrict',
      score: 11,
      severity: 'critical'
    })
  })

  it('holds concordant price and explicit service language for human review', () => {
    expect(evaluateAntiSolicitation('Quel tarif pour un service sexuel ?', rules)).toMatchObject({
      outcome: 'hold',
      score: 7,
      matchedCategories: ['price', 'sexual_service']
    })
  })

  it('raises a warning when payment and an external channel are combined', () => {
    expect(evaluateAntiSolicitation('On voit le cash sur WhatsApp', rules)).toMatchObject({
      outcome: 'warn',
      score: 4
    })
  })

  it('adds a repetition signal without duplicating rule categories', () => {
    expect(evaluateAntiSolicitation('Mon tarif', rules, { repeatedRecipientCount: 4 })).toMatchObject({
      outcome: 'warn',
      score: 3,
      matchedCategories: ['price', 'repetition']
    })
  })

  it('excludes official LHR commercial sources', () => {
    expect(evaluateAntiSolicitation('Tarif service sexuel', rules, { source: 'official_event' })).toMatchObject({
      outcome: 'allow',
      score: 0,
      matchedRuleIds: []
    })
  })
})
