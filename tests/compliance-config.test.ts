import { describe, expect, it } from 'vitest'
import { getComplianceFlags } from '@/config/compliance'
import { getLegalEntityConfig, getLegalReadiness } from '@/lib/legal-entity-config'

describe('compliance configuration', () => {
  it('keeps every feature disabled unless the value is exactly true', () => {
    const flags = getComplianceFlags({
      COMPLIANCE_LEGAL_CENTER_ENABLED: 'TRUE',
      COMPLIANCE_CONTACT_SAFETY_ENABLED: 'true',
      COMPLIANCE_SCOPED_CONVERSATION_ACCESS_ENABLED: '1'
    })

    expect(flags).toEqual({
      legalCenter: false,
      versionedAcceptance: false,
      sensitiveConsent: false,
      newReporting: false,
      moderationAppeals: false,
      coupleAccounts: false,
      openCurtainConsent: false,
      paymentHardening: false,
      contactSafety: true,
      scopedConversationAccess: false
    })
  })

  it('never treats blank legal values as publishable information', () => {
    const config = getLegalEntityConfig({
      LEGAL_ENTITY_NAME: '  ',
      LEGAL_CONTACT_EMAIL: ' juridique@example.test '
    })

    expect(config.entityName).toBeNull()
    expect(config.legalContactEmail).toBe('juridique@example.test')
  })

  it('fails payment readiness closed and reports missing field names only', () => {
    const readiness = getLegalReadiness({
      LEGAL_ENTITY_NAME: 'LHR Test',
      LEGAL_CONTACT_EMAIL: 'juridique@example.test'
    })

    expect(readiness.paymentReady).toBe(false)
    expect(readiness.missingPaymentFields).toEqual(expect.arrayContaining([
      'LEGAL_ENTITY_ADDRESS',
      'CONSUMER_MEDIATOR_NAME',
      'PAYMENT_PROVIDER_NAME'
    ]))
    expect(JSON.stringify(readiness)).not.toContain('juridique@example.test')
  })
})
