import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dashboardActions = readFileSync('actions/admin-stats-actions.ts', 'utf8')
const dashboardUi = readFileSync('components/admin-real-time-stats.tsx', 'utf8')
const userActions = readFileSync('actions/user-actions.ts', 'utf8')
const conversationActions = readFileSync('actions/conversation-actions.ts', 'utf8')
const eventActions = readFileSync('actions/event-actions.ts', 'utf8')
const charts = readFileSync('components/admin-stats.tsx', 'utf8')

describe('admin KPI correctness', () => {
  it('measures presence independently from message sending', () => {
    expect(dashboardActions).toContain('last_seen_at >= NOW() - INTERVAL \'24 hours\'')
    expect(dashboardActions).toContain('last_seen_at >= NOW() - INTERVAL \'10 minutes\'')
    expect(dashboardActions).toContain('match_requests_last_24h')
    expect(dashboardActions).toContain('wall_activity_last_24h')
    expect(dashboardActions).not.toContain('DATE(created_at) = DATE(NOW())')
  })

  it('does not silently turn a dashboard database failure into fake zero activity', () => {
    expect(dashboardActions).not.toContain('Requête échouée:')
    expect(dashboardActions).not.toContain('Retour de statistiques par défaut')
  })

  it('shows explicit time windows and community activity in the admin UI', () => {
    expect(dashboardUi).toContain('En ligne maintenant')
    expect(dashboardUi).toContain('Actifs sur 24 h')
    expect(dashboardUi).toContain('Demandes de contact (24 h)')
    expect(dashboardUi).toContain('Activité du mur (24 h)')
    expect(dashboardUi).toContain('Demandes support (24 h)')
  })

  it('includes the full end date in every historical chart and guards admin access', () => {
    expect(userActions).toContain("($2::date + INTERVAL '1 day')")
    expect(conversationActions).toContain("($2::date + INTERVAL '1 day')")
    expect(eventActions).toContain("($2::date + INTERVAL '1 day')")
    expect(conversationActions).toMatch(/getMessagesStats[\s\S]*?requireAdmin\(\)/)
    expect(eventActions).toMatch(/getEventSubscriptionsStats[\s\S]*?requireAdmin\(\)/)
    expect(charts).toContain('Demandes de contact')
    expect(charts).toContain('const end = new Date()')
    expect(charts).toContain('setInterval(fetchStats, 120000)')
  })
})
