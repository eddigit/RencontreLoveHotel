export type InvestigationCategory = 'paid_solicitation' | 'safety' | 'harassment' | 'fraud' | 'other'

const categories: Array<[InvestigationCategory, RegExp]> = [
  ['paid_solicitation', /(prostitut|prestation sexuelle|service sexuel|r[eé]mun[eé]r|contre avantage|tarif|escort|cash)/i],
  ['safety', /(mineur|danger|violence|agression)/i],
  ['harassment', /(menace|harc[eè]lement|chantage)/i],
  ['fraud', /(fraude|arnaque|escroquer|paiement)/i]
]

export function inferInvestigationCategory(text: string): InvestigationCategory {
  return categories.find(([, pattern]) => pattern.test(text))?.[0] || 'other'
}

export function investigationPriority(category: InvestigationCategory): number {
  return { paid_solicitation: 100, safety: 80, harassment: 60, fraud: 40, other: 10 }[category]
}

export function getInitials(name?: string | null): string {
  const words = (name || 'Membre').trim().split(/[\s-]+/).filter(Boolean)
  return `${words[0]?.[0] || 'M'}${words[1]?.[0] || words[0]?.[1] || ''}`.toUpperCase().slice(0, 2)
}

export const investigationCategoryLabels: Record<InvestigationCategory, string> = {
  paid_solicitation: 'Priorité prostitution / contrepartie',
  safety: 'Danger ou mineur présumé',
  harassment: 'Menace ou harcèlement',
  fraud: 'Fraude ou escroquerie',
  other: 'Autre signalement'
}
