export type ModerationOutcome = 'allow' | 'warn' | 'hold' | 'restrict'

export type ModerationPolicyRule = {
  id: string
  keyword: string
  category: string
  weight: number
  phrase: boolean
  active: boolean
}

export type PolicyEvaluation = {
  outcome: ModerationOutcome
  score: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  matchedRuleIds: string[]
  matchedCategories: string[]
  policyVersion: string
}

export type PolicyContext = {
  repeatedRecipientCount?: number
  source?: 'member_message' | 'member_profile' | 'member_event' | 'official_event' | 'official_room' | 'official_concierge'
}

export const ANTI_SOLICITATION_POLICY_VERSION = 'anti-solicitation-2026-07-15'

const officialSources = new Set<PolicyContext['source']>([
  'official_event',
  'official_room',
  'official_concierge'
])

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesRule(content: string, rule: ModerationPolicyRule) {
  const keyword = normalize(rule.keyword)
  if (!keyword) return false
  const pattern = rule.phrase
    ? escapeRegExp(keyword).replace(/\\ /g, '\\s+')
    : `(?:^|[^a-z0-9])${escapeRegExp(keyword)}(?:$|[^a-z0-9])`
  return new RegExp(pattern, 'i').test(content)
}

function outcomeFor(score: number): ModerationOutcome {
  if (score >= 8) return 'restrict'
  if (score >= 6) return 'hold'
  if (score >= 3) return 'warn'
  return 'allow'
}

function severityFor(outcome: ModerationOutcome) {
  if (outcome === 'restrict') return 'critical' as const
  if (outcome === 'hold') return 'high' as const
  if (outcome === 'warn') return 'medium' as const
  return 'low' as const
}

export function evaluateAntiSolicitation(
  content: string,
  rules: ModerationPolicyRule[],
  context: PolicyContext = {}
): PolicyEvaluation {
  if (officialSources.has(context.source)) {
    return {
      outcome: 'allow',
      score: 0,
      severity: 'low',
      matchedRuleIds: [],
      matchedCategories: [],
      policyVersion: ANTI_SOLICITATION_POLICY_VERSION
    }
  }

  const normalizedContent = normalize(content)
  const matchedRules = rules.filter(rule => rule.active && matchesRule(normalizedContent, rule))
  const matchedRuleIds = matchedRules.map(rule => rule.id)
  const matchedCategories = [...new Set(matchedRules.map(rule => rule.category))]
  let score = matchedRules.reduce((sum, rule) => sum + Math.max(0, rule.weight), 0)

  if ((context.repeatedRecipientCount || 0) >= 3) {
    score += 2
    matchedCategories.push('repetition')
  }

  const outcome = outcomeFor(score)
  return {
    outcome,
    score,
    severity: severityFor(outcome),
    matchedRuleIds,
    matchedCategories,
    policyVersion: ANTI_SOLICITATION_POLICY_VERSION
  }
}
