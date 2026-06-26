import { describe, expect, it } from 'vitest'
import {
  formatDeploymentDate,
  getDeploymentLabel
} from '../lib/deployment-info'

describe('deployment footer information', () => {
  it('formats deployment date in French Paris time', () => {
    expect(formatDeploymentDate('2026-06-10T10:38:04.925Z')).toBe(
      '10/06/2026 12:38'
    )
  })

  it('builds the footer deployment label', () => {
    expect(
      getDeploymentLabel({
        version: '0.1.0',
        buildNumber: 42,
        deploymentDate: '2026-06-10T10:38:04.925Z'
      })
    ).toBe('Déploiement : 10/06/2026 12:38 · build 42')
  })
})
