export type SafetySurface =
  | 'message'
  | 'profile'
  | 'member_event'
  | 'wall_post'
  | 'wall_comment'
  | 'attachment_filename'

export type SafetySignalCategory =
  | 'phone_number'
  | 'email_address'
  | 'external_messaging'
  | 'external_redirect'
  | 'payment_handle'
  | 'pricing'
  | 'escort'
  | 'sugar'
  | 'commercial_adult_content'
  | 'minor_risk'
  | 'coercion'
  | 'trafficking'
  | 'non_consensual_media'
  | 'financial_scam'
  | 'violence'

export type SafetyEvaluation = {
  decision: 'allow' | 'block' | 'hold'
  score: number
  categories: SafetySignalCategory[]
  ruleIds: string[]
  maskedExcerpt: string
  engineVersion: string
}

export type MemberContentInput = {
  surface: SafetySurface
  content: string
  origin?: 'member' | 'official'
}

const ENGINE_VERSION = 'contact-safety-2026-07-18'
const phonePattern = /(?:\+\s*33\s*(?:\(\s*0\s*\)\s*)?|0)\s*[1-9](?:[\s.()/-]*\d{2}){4}\b/giu
const compactPhoneWithIntentPattern = /\b(?:tel(?:ephone)?|numero|mobile|appelle(?:r)?|sms)\s*[:=-]?\s*(?:33|0)?[1-9]\d{8}\b/giu
const writtenPhonePattern = /\bzero\s+(?:six|sept)\s+(?:\d{2}[\s.()-]*){3}\d{2}\b/giu
const emailPattern = /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/giu
const obfuscatedEmailPattern = /\b[a-z0-9._%+-]+\s+(?:arobase|at)\s+[a-z0-9.-]+\s+(?:point|dot)\s+(?:com|fr|net|org|eu|io)\b/giu
const externalMessagingPattern = /(?:\b(?:ajoute|viens|contacte|ecris|retrouve|parle)[-\s\w]{0,24}\b(?:whatsapp|telegram|signal|snapchat|snap|instagram|insta)\b|\b(?:whatsapp|telegram|signal|snapchat|snap|instagram|insta)\s*(?:au|sur|:|@|est|=)\s*[+@a-z0-9])/giu
const paymentHandlePattern = /(?:\b(?:paypal\.me|paypal|revolut|lydia|cash\s*app)\b\s*(?:[/:@=]|sur|a)\s*[@a-z0-9]|\b(?:envoie|paie|verse)\b.{0,20}\b(?:paypal|revolut|lydia|cash\s*app)\b)/giu
const externalRedirectPattern = /(?:https?:\/\/)?(?:t\.me|wa\.me|chat\.whatsapp\.com|signal\.me|snapchat\.com\/add|bit\.ly|tinyurl\.com|t\.co)\/[a-z0-9._~:/?#[\]@!$&'()*+,;=%-]+/giu

function normalize(value: string) {
  return value
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xfee0))
}

function matches(pattern: RegExp, value: string) {
  pattern.lastIndex = 0
  return pattern.test(value)
}

function mask(value: string) {
  return value
    .replace(emailPattern, '[email masqué]')
    .replace(obfuscatedEmailPattern, '[email masqué]')
    .replace(phonePattern, '[téléphone masqué]')
    .replace(compactPhoneWithIntentPattern, '[téléphone masqué]')
    .replace(writtenPhonePattern, '[téléphone masqué]')
    .replace(externalRedirectPattern, '[lien masqué]')
    .replace(/@[a-z0-9._-]{2,}/giu, '@[identifiant masqué]')
    .slice(0, 500)
}

export function evaluateMemberContent(input: MemberContentInput): SafetyEvaluation {
  if (input.origin === 'official') {
    return {
      decision: 'allow', score: 0, categories: [], ruleIds: [],
      maskedExcerpt: input.content.slice(0, 500), engineVersion: ENGINE_VERSION
    }
  }

  const content = normalize(input.content)
  const categories = new Set<SafetySignalCategory>()
  const ruleIds: string[] = []

  if (matches(phonePattern, content) || matches(compactPhoneWithIntentPattern, content) || matches(writtenPhonePattern, content)) {
    categories.add('phone_number')
    ruleIds.push('contact.phone')
  }
  if (matches(emailPattern, content) || matches(obfuscatedEmailPattern, content)) {
    categories.add('email_address')
    ruleIds.push('contact.email')
  }
  if (matches(externalMessagingPattern, content)) {
    categories.add('external_messaging')
    ruleIds.push('contact.external_messaging')
  }
  if (matches(paymentHandlePattern, content)) {
    categories.add('payment_handle')
    ruleIds.push('contact.payment_handle')
  }
  if (matches(externalRedirectPattern, content)) {
    categories.add('external_redirect')
    ruleIds.push('contact.external_redirect')
  }

  const detected = categories.size > 0
  return {
    decision: detected ? 'block' : 'allow',
    score: detected ? Math.min(100, 50 + categories.size * 10) : 0,
    categories: [...categories],
    ruleIds,
    maskedExcerpt: detected ? mask(content) : input.content.slice(0, 500),
    engineVersion: ENGINE_VERSION
  }
}

export class ContactSafetyError extends Error {
  readonly code = 'OFF_PLATFORM_CONTACT_BLOCKED'
  readonly evaluation: SafetyEvaluation

  constructor(evaluation: SafetyEvaluation) {
    super('Pour votre sécurité, les coordonnées et moyens de contact externes ne peuvent pas être partagés. Poursuivez votre échange dans LHR.')
    this.name = 'ContactSafetyError'
    this.evaluation = evaluation
  }
}

export function assertMemberContentAllowed(input: MemberContentInput) {
  const evaluation = evaluateMemberContent(input)
  if (evaluation.decision !== 'allow') throw new ContactSafetyError(evaluation)
  return evaluation
}
