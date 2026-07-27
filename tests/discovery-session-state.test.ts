import { describe, expect, it } from 'vitest'
import {
  discoverySnapshotKey,
  orderProfilesFromSnapshot
} from '@/lib/discovery-session-state'

describe('discovery session state', () => {
  it('builds a stable key for the same search state', () => {
    const filters = {
      status: 'trans',
      orientation: 'bi',
      onlineOnly: true
    }

    expect(discoverySnapshotKey('member-1', filters, ' Paris ', 2)).toBe(
      discoverySnapshotKey('member-1', filters, 'Paris', 2)
    )
    expect(discoverySnapshotKey('member-1', filters, 'Paris', 2))
      .toContain('lhr-discovery-v4')
  })

  it('restores the exact profile order after returning from a member profile', () => {
    const current = [
      { id: 'c', name: 'C' },
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'd', name: 'D' }
    ]

    expect(orderProfilesFromSnapshot(current, ['b', 'c', 'a'])).toEqual([
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
      { id: 'a', name: 'A' },
      { id: 'd', name: 'D' }
    ])
  })
})
