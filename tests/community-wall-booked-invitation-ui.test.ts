import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('booked room invitation UI', () => {
  it('makes reservation and participation explicit without exposing the reference', () => {
    const wall = readFileSync('components/community-wall.tsx', 'utf8')
    const actions = readFileSync('actions/community-wall-actions.ts', 'utf8')

    expect(wall).toContain('Chambre déjà réservée')
    expect(wall).toContain('Référence de réservation')
    expect(wall).toContain('Demander à participer')
    expect(wall).toContain('Voir les demandes')
    expect(wall).toContain('Accepter')
    expect(wall).toContain('Refuser')
    expect(wall).toContain('Places confirmées')
    expect(wall).toContain('Disponibilité non garantie')
    expect(wall).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(actions).toContain('requestWallParticipation')
    expect(actions).toContain('getWallParticipationRequests')
    expect(actions).toContain('decideWallParticipationRequest')

    const feedSelection = actions.slice(
      actions.indexOf('export async function getCommunityWallFeed'),
      actions.indexOf('export async function getWallComments')
    )
    expect(feedSelection).not.toContain('wp.booking_reference')
  })
})
