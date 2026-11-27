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

    expect(discoverySnapshotKey('member-1', filters, ' Paris ', 2, 'visit-a')).toBe(
      discoverySnapshotKey('member-1', filters, 'Paris', 2, 'visit-a')
    )
    expect(discoverySnapshotKey('member-1', filters, 'Paris', 2, 'visit-a'))
      .toContain('lhr-discovery-v6')
  })

  it('does not reuse a prior visit snapshot for a new discovery visit', () => {
    const filters = { status: 'all' }

    expect(discoverySnapshotKey('member-1', filters, '', 0, 'visit-a'))
      .not.toBe(discoverySnapshotKey('member-1', filters, '', 0, 'visit-b'))
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
