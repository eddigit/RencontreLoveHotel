import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

function readFile (filePath: string) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
}

describe('Progressive Love Hotel encounter concept', () => {
  it('keeps the community home focused on real upcoming meetings', () => {
    const discover = readFile('app/discover/page.tsx')

    expect(discover).toContain('upcomingEvents.map')
    expect(discover).toContain("href='/events'")
    expect(discover).toContain("href='/lieux'")
    expect(discover).toContain("mediaImage(event.image")
  })

  it('positions events as progressive experiences around real Love Hotel places', () => {
    const events = readFile('app/events/page.tsx')

    expect(events).toContain('De la rencontre douce à l’expérience assumée')
    expect(events).toContain('Apéro jacuzzi 2 à 4 couples')
    expect(events).toContain('Initiation rideaux modulables')
    expect(events).toContain('Soirée rideaux ouverts')
  })

  it('frames Love Rooms as the physical trigger for community encounters', () => {
    const loveRooms = readFile('app/love-rooms/page.tsx')

    expect(loveRooms).toContain('La chambre devient le déclencheur de rencontre')
    expect(loveRooms).toContain('Rideaux fermés')
    expect(loveRooms).toContain('Rideaux entrouverts')
    expect(loveRooms).toContain('Rideaux ouverts')
  })
})
