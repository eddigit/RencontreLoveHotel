import { describe, it, expect } from 'vitest'

// Test simple pour vérifier que le fichier compile
describe('Compilation Test', () => {
  it('should compile admin stats actions', async () => {
    // Import dynamique pour vérifier la compilation
    const { getAdminDashboardStats, getRealTimeMetrics } = await import('../actions/admin-stats-actions')
    
    expect(getAdminDashboardStats).toBeDefined()
    expect(getRealTimeMetrics).toBeDefined()
    expect(typeof getAdminDashboardStats).toBe('function')
    expect(typeof getRealTimeMetrics).toBe('function')
  })
})
