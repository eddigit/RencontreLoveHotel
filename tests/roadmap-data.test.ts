import { describe, expect, it } from 'vitest'
import { getRoadmapSummary, roadmapItems, roadmapStatuses } from '../lib/admin-roadmap'

describe('admin roadmap data', () => {
  it('exposes the three roadmap sections requested for the admin module', () => {
    const summary = getRoadmapSummary(roadmapItems)

    expect(summary.ok).toBeGreaterThan(0)
    expect(summary.issue).toBeGreaterThan(0)
    expect(summary.developed).toBeGreaterThan(0)
  })

  it('covers every roadmap status used by the complete beta cockpit', () => {
    const summary = getRoadmapSummary(roadmapItems)

    expect(roadmapStatuses).toEqual(['ok', 'issue', 'developed', 'planned'])
    expect(summary.planned).toBeGreaterThan(0)
  })

  it('keeps roadmap items actionable for client and technical follow-up', () => {
    for (const item of roadmapItems) {
      expect(item.phase.length).toBeGreaterThan(0)
      expect(item.owner.length).toBeGreaterThan(0)
      expect(item.impact.length).toBeGreaterThan(0)
      expect(item.nextAction.length).toBeGreaterThan(0)
    }
  })
})
