import type { ComplianceEnvironment } from '@/config/compliance'

const legalKeys = {
  entityName: 'LEGAL_ENTITY_NAME',
  entityForm: 'LEGAL_ENTITY_FORM',
  entityCapital: 'LEGAL_ENTITY_CAPITAL',
  entityAddress: 'LEGAL_ENTITY_ADDRESS',
  registrationNumber: 'LEGAL_ENTITY_REGISTRATION_NUMBER',
  vatNumber: 'LEGAL_ENTITY_VAT_NUMBER',
  legalContactEmail: 'LEGAL_CONTACT_EMAIL',
  privacyContactEmail: 'PRIVACY_CONTACT_EMAIL',
  dsaContactEmail: 'DSA_CONTACT_EMAIL',
  moderationContactEmail: 'MODERATION_CONTACT_EMAIL',
  consumerMediatorName: 'CONSUMER_MEDIATOR_NAME',
  consumerMediatorAddress: 'CONSUMER_MEDIATOR_ADDRESS',
  consumerMediatorUrl: 'CONSUMER_MEDIATOR_URL',
  paymentProviderName: 'PAYMENT_PROVIDER_NAME',
  paymentDescriptor: 'PAYMENT_DESCRIPTOR',
  hostingProviderName: 'HOSTING_PROVIDER_NAME',
  hostingProviderAddress: 'HOSTING_PROVIDER_ADDRESS',
  ageAssuranceProvider: 'AGE_ASSURANCE_PROVIDER',
  legalDocumentsEffectiveDate: 'LEGAL_DOCUMENTS_EFFECTIVE_DATE'
} as const

function value(env: ComplianceEnvironment, key: string) {
  const result = env[key]?.trim()
  return result ? result : null
}

export function getLegalEntityConfig(env: ComplianceEnvironment = process.env) {
  return Object.fromEntries(
    Object.entries(legalKeys).map(([property, key]) => [property, value(env, key)])
  ) as Record<keyof typeof legalKeys, string | null>
}

const paymentRequiredKeys = [
  'LEGAL_ENTITY_NAME',
  'LEGAL_ENTITY_FORM',
  'LEGAL_ENTITY_ADDRESS',
  'LEGAL_ENTITY_REGISTRATION_NUMBER',
  'LEGAL_CONTACT_EMAIL',
  'CONSUMER_MEDIATOR_NAME',
  'CONSUMER_MEDIATOR_ADDRESS',
  'CONSUMER_MEDIATOR_URL',
  'PAYMENT_PROVIDER_NAME',
  'PAYMENT_DESCRIPTOR'
] as const

const publicationRequiredKeys = [
  'LEGAL_ENTITY_NAME',
  'LEGAL_ENTITY_FORM',
  'LEGAL_ENTITY_ADDRESS',
  'LEGAL_ENTITY_REGISTRATION_NUMBER',
  'LEGAL_CONTACT_EMAIL',
  'PRIVACY_CONTACT_EMAIL',
  'HOSTING_PROVIDER_NAME',
  'HOSTING_PROVIDER_ADDRESS',
  'LEGAL_DOCUMENTS_EFFECTIVE_DATE'
] as const

export function getLegalReadiness(env: ComplianceEnvironment = process.env) {
  const missingPaymentFields = paymentRequiredKeys.filter(key => !value(env, key))
  const missingPublicationFields = publicationRequiredKeys.filter(key => !value(env, key))

  return {
    paymentReady: missingPaymentFields.length === 0,
    publicationReady: missingPublicationFields.length === 0,
    missingPaymentFields,
    missingPublicationFields
  }
}
