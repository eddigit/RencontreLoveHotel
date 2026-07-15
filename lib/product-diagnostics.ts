export type ProductDiagnosticMetrics = {
  accounts: number
  profileRows: number
  eligibleProfiles: number
  profilesWithMedia: number
  profilesWithBio: number
  completeProfiles: number
  uniqueExposed30d: number
  impressions30d: number
  matchRequests: number
  pendingMatches: number
  acceptedMatches: number
  rejectedMatches: number
  conversations: number
  startedConversations: number
  reciprocalConversations: number
  messages30d: number
  futureEvents: number
  eventParticipants: number
  openReports: number
  schemaReady: number
  schemaExpected: number
}

export type DiagnosticSeverity = 'critical' | 'high' | 'medium' | 'low'

export type DiagnosticAction = {
  id: string
  title: string
  severity: DiagnosticSeverity
  evidence: string
  impact: string
  nextAction: string
  effort: 'Faible' | 'Moyen' | 'Élevé'
}

export type ProductDiagnostic = {
  metrics: ProductDiagnosticMetrics
  overallScore: number
  pillarScores: Record<'community' | 'profiles' | 'discovery' | 'matching' | 'messaging' | 'events' | 'trust', number>
  funnel: Array<{ label: string; value: number }>
  actions: DiagnosticAction[]
  generatedAt: string
}

const severityOrder: Record<DiagnosticSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)))
}

function ratio(part: number, total: number) {
  return total > 0 ? clamp((part / total) * 100) : 0
}

export function buildProductDiagnostic(metrics: ProductDiagnosticMetrics): ProductDiagnostic {
  const community = ratio(metrics.eligibleProfiles, metrics.accounts)
  const profiles = clamp((
    ratio(metrics.profilesWithMedia, metrics.eligibleProfiles) +
    ratio(metrics.profilesWithBio, metrics.eligibleProfiles) +
    ratio(metrics.completeProfiles, metrics.eligibleProfiles)
  ) / 3)
  const discovery = metrics.impressions30d > 0
    ? ratio(metrics.uniqueExposed30d, metrics.eligibleProfiles)
    : 15
  const matching = ratio(metrics.acceptedMatches, Math.max(1, metrics.acceptedMatches + metrics.pendingMatches + metrics.rejectedMatches))
  const messaging = clamp((
    ratio(metrics.startedConversations, metrics.conversations) +
    ratio(metrics.reciprocalConversations, metrics.startedConversations) +
    (metrics.messages30d > 0 ? 70 : 0)
  ) / 3)
  const events = metrics.futureEvents > 0 ? clamp(55 + Math.min(45, metrics.futureEvents * 8)) : 0
  const trust = ratio(metrics.schemaReady, metrics.schemaExpected)

  const pillarScores = { community, profiles, discovery, matching, messaging, events, trust }
  const overallScore = clamp(Object.values(pillarScores).reduce((sum, value) => sum + value, 0) / 7)
  const actions: DiagnosticAction[] = []

  if (metrics.futureEvents === 0) actions.push({
    id: 'no-upcoming-events',
    title: 'Programmer des événements à venir',
    severity: 'critical',
    evidence: 'Aucun événement futur n’est actuellement visible.',
    impact: 'La promesse de rencontre réelle ne peut pas convertir sans date disponible.',
    nextAction: 'Publier au moins deux prochains formats Love Hôtel avec date, capacité et appel à participation.',
    effort: 'Moyen'
  })

  if (metrics.messages30d === 0) actions.push({
    id: 'no-message-activity',
    title: 'Relancer les conversations membres',
    severity: 'critical',
    evidence: 'Aucun message membre mesuré sur les 30 derniers jours.',
    impact: 'Les inscriptions et matchs ne produisent plus de relation active.',
    nextAction: 'Créer les fils après acceptation, proposer un premier message et notifier les matchs silencieux.',
    effort: 'Moyen'
  })

  if (ratio(metrics.pendingMatches, metrics.matchRequests) >= 70) actions.push({
    id: 'pending-match-backlog',
    title: 'Résorber les demandes de match en attente',
    severity: 'critical',
    evidence: `${metrics.pendingMatches.toLocaleString('fr-FR')} demandes sont encore en attente.`,
    impact: 'Les membres restent sans réponse et perdent confiance dans l’activité du site.',
    nextAction: 'Expirer les demandes anciennes et remettre les demandes actives au premier plan.',
    effort: 'Faible'
  })

  if (ratio(metrics.reciprocalConversations, metrics.startedConversations) < 25) actions.push({
    id: 'low-conversation-reciprocity',
    title: 'Améliorer le taux de réponse',
    severity: 'critical',
    evidence: `${metrics.reciprocalConversations} conversations réciproques sur ${metrics.startedConversations} démarrées.`,
    impact: 'La majorité des premiers messages n’aboutit pas à un échange.',
    nextAction: 'Contextualiser les ouvertures et suivre le délai jusqu’à la première réponse.',
    effort: 'Moyen'
  })

  if (profiles < 50) actions.push({
    id: 'low-profile-quality',
    title: 'Compléter les profils visibles',
    severity: 'high',
    evidence: `${metrics.profilesWithMedia} profils avec média et ${metrics.profilesWithBio} avec biographie.`,
    impact: 'Des profils pauvres réduisent les clics, les demandes et les réponses.',
    nextAction: 'Afficher une jauge de complétude et guider chaque membre vers la prochaine information utile.',
    effort: 'Moyen'
  })

  if (metrics.profileRows < metrics.accounts) actions.push({
    id: 'missing-profile-shells',
    title: 'Récupérer les comptes sans profil',
    severity: 'high',
    evidence: `${metrics.accounts - metrics.profileRows} comptes n’ont aucune ligne de profil.`,
    impact: 'Ces comptes ne peuvent pas entrer correctement dans la communauté.',
    nextAction: 'Créer des profils privés manquants puis inviter les membres consentants à les compléter.',
    effort: 'Faible'
  })

  if (metrics.schemaReady < metrics.schemaExpected) actions.push({
    id: 'schema-readiness',
    title: 'Aligner la base avec la version applicative',
    severity: 'high',
    evidence: `${metrics.schemaReady}/${metrics.schemaExpected} éléments de schéma de pilotage sont disponibles.`,
    impact: 'Des métriques peuvent disparaître ou être affichées à zéro sans refléter la réalité.',
    nextAction: 'Appliquer les migrations versionnées puis vérifier la présence et les index.',
    effort: 'Faible'
  })

  if (metrics.impressions30d === 0) actions.push({
    id: 'exposure-instrumentation',
    title: 'Mesurer la rotation des profils',
    severity: 'medium',
    evidence: 'Aucune impression profil n’est encore enregistrée.',
    impact: 'La répétition et l’équité d’exposition ne peuvent pas être pilotées.',
    nextAction: 'Activer les événements d’impression agrégés sur la page Communauté.',
    effort: 'Faible'
  })

  actions.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity])

  return {
    metrics,
    overallScore,
    pillarScores,
    funnel: [
      { label: 'Comptes', value: metrics.accounts },
      { label: 'Profils', value: metrics.profileRows },
      { label: 'Profils affichables', value: metrics.eligibleProfiles },
      { label: 'Matchs acceptés', value: metrics.acceptedMatches },
      { label: 'Conversations démarrées', value: metrics.startedConversations },
      { label: 'Conversations réciproques', value: metrics.reciprocalConversations },
      { label: 'Participations événements', value: metrics.eventParticipants }
    ],
    actions,
    generatedAt: new Date().toISOString()
  }
}
