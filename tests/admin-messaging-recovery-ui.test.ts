import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('admin messaging recovery dashboard', () => {
  it('shows the recovery indicators with explicit business labels', () => {
    const component = readFileSync(
      'components/admin-messaging-recovery.tsx',
      'utf8'
    )

    expect(component).toContain('Relance de la messagerie')
    expect(component).toContain('Conversations créées')
    expect(component).toContain('Conversations démarrées')
    expect(component).toContain('Messages envoyés')
    expect(component).toContain('Conversations actives')
    expect(component).toContain('Conversations avec échange')
    expect(component).toContain('Taux d’échange')
    expect(component).toContain('Matchs acceptés')
    expect(component).toContain('Admin / conciergerie')
    expect(component).toContain('Jour')
    expect(component).toContain('Semaine')
    expect(component).toContain('Mois')
    expect(component).toContain('selectedPeriodLabel')
    expect(component).toContain('Période civile, heure de Paris')
    expect(component).toContain('Actualiser les statistiques')
    expect(component).toContain("timeZone: 'Europe/Paris'")
  })

  it('uses one messaging dashboard instead of rendering conflicting duplicates', () => {
    const page = readFileSync('app/admin/page.tsx', 'utf8')

    expect(page).toContain('AdminMessagingRecovery')
    expect(page.indexOf('<AdminMessagingRecovery')).toBeGreaterThan(-1)
    expect(page).not.toContain('<AdminRealTimeStats')
    expect(page).not.toContain('<AdminStats')
    expect(page).toContain('getAdminOverviewCounts')
    expect(page).not.toContain('getUpcomingEvents')
    expect(page).toContain('Chargement…')
    expect(page).toContain('Indisponible')
  })

  it('renders a continuous trend chart and a visible error state', () => {
    const component = readFileSync(
      'components/admin-messaging-recovery.tsx',
      'utf8'
    )

    expect(component).toContain("dataKey='messages'")
    expect(component).toContain("dataKey='activeConversations'")
    expect(component).toContain("dataKey='acceptedMatches'")
    expect(component).toContain('Impossible de charger les KPI de messagerie')
  })

  it('shows lifetime activity on dual axes with a recovery comparison', () => {
    const component = readFileSync(
      'components/admin-messaging-recovery.tsx',
      'utf8'
    )

    expect(component).toContain('getMessagingRecoveryHistory')
    expect(component).toContain('Activité depuis le lancement')
    expect(component).toContain('30 derniers jours complets')
    expect(component).toContain("yAxisId='messages'")
    expect(component).toContain("yAxisId='activity'")
    expect(component).toContain("dataKey='createdConversations'")
    expect(component).toContain("dataKey='activeConversations'")
    expect(component).toContain('Impossible de charger l’historique')
  })
})
