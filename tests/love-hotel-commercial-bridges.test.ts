import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Love Hotel commercial bridges', () => {
  const discover = fs.readFileSync(path.join(process.cwd(), 'app/discover/page.tsx'), 'utf8')
  const events = fs.readFileSync(path.join(process.cwd(), 'app/events/page.tsx'), 'utf8')
  const loveRooms = fs.readFileSync(path.join(process.cwd(), 'app/love-rooms/page.tsx'), 'utf8')

  it('promotes official Love Hotel activity from the community home', () => {
    expect(discover).toContain('Expériences officielles Love Hotel')
    expect(discover).toContain('Châtelet')
    expect(discover).toContain('Pigalle')
    expect(discover).toContain('Love Room à l’heure')
    expect(discover).toContain('Jacuzzi privatif')
    expect(discover).toContain('Rideaux ouverts')
  })

  it('keeps community profiles visible before the commercial bridge', () => {
    expect(discover.indexOf("id='new-profiles'")).toBeLessThan(
      discover.indexOf('Expériences officielles Love Hotel')
    )
    expect(discover).not.toContain("lg:grid-cols-[minmax(0,1fr)_280px]")
  })

  it('connects events to rooms, jacuzzi and official booking opportunities', () => {
    expect(events).toContain('Apéro jacuzzi')
    expect(events).toContain('Rideaux ouverts')
    expect(events).toContain('/love-rooms')
    expect(events).toContain('Réserver une chambre')
  })

  it('turns Love Rooms into opportunities for community events', () => {
    expect(loveRooms).toContain('Sources de rencontres')
    expect(loveRooms).toContain('Créer un apéro jacuzzi')
    expect(loveRooms).toContain('Organiser des rideaux ouverts')
    expect(loveRooms).toContain('À partir de 35 €/h')
  })
})
