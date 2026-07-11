import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

function readFile (filePath: string) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
}

describe('Progressive Love Hotel encounter concept', () => {
  it('presents the three levels of openness on the community home', () => {
    const discover = readFile('app/discover/page.tsx')

    expect(discover).toContain('Choisir son degré d’ouverture')
    expect(discover).toContain('Découverte douce')
    expect(discover).toContain('Curiosité encadrée')
    expect(discover).toContain('Expérience assumée')
    expect(discover).toContain('rideaux fermés, entrouverts ou ouverts')
    expect(discover).toContain('RIDEAUX OUVERTS')
    expect(discover).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(discover.indexOf('RIDEAUX OUVERTS')).toBeLessThan(discover.indexOf("<h2 className='font-black'>Vos matchs</h2>"))
  })

  it('positions events as visual formats around real Love Hotel places', () => {
    const events = readFile('app/events/page.tsx')

    expect(events).toContain('Événements à venir')
    expect(events).toContain('Apéro jacuzzi 2 à 4 couples')
    expect(events).toContain('Rideaux ouverts 2 ou 3 chambres')
    expect(events).toContain('/apero-jacuzzi-rencontre.jpg')
    expect(events).toContain('/rideaux-ouverts-rencontre.jpg')
  })

  it('frames Love Rooms as the physical trigger for community encounters', () => {
    const loveRooms = readFile('app/love-rooms/page.tsx')

    expect(loveRooms).toContain('La chambre devient le déclencheur de rencontre')
    expect(loveRooms).toContain('Rideaux fermés')
    expect(loveRooms).toContain('Rideaux entrouverts')
    expect(loveRooms).toContain('Rideaux ouverts')
  })
})
