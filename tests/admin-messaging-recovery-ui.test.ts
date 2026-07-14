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
    expect(component).toContain('Conversations avec réponse')
    expect(component).toContain('Taux de réponse')
    expect(component).toContain('Matchs acceptés')
    expect(component).toContain('Admin / conciergerie')
    expect(component).toContain('Jour')
    expect(component).toContain('Semaine')
    expect(component).toContain('Mois')
  })

  it('places recovery visibility before the generic real-time dashboard', () => {
    const page = readFileSync('app/admin/page.tsx', 'utf8')

    expect(page).toContain('AdminMessagingRecovery')
    expect(page.indexOf('<AdminMessagingRecovery')).toBeGreaterThan(-1)
    expect(page.indexOf('<AdminMessagingRecovery')).toBeLessThan(
      page.indexOf('<AdminRealTimeStats')
    )
  })

  it('renders a continuous trend chart and a visible error state', () => {
    const component = readFileSync(
      'components/admin-messaging-recovery.tsx',
      'utf8'
    )

    expect(component).toContain('dataKey="startedConversations"')
    expect(component).toContain('dataKey="messages"')
    expect(component).toContain('dataKey="acceptedMatches"')
    expect(component).toContain('Impossible de charger les KPI de messagerie')
  })
})
