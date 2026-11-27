import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Love Hotel commercial bridges', () => {
  const discover = fs.readFileSync(path.join(process.cwd(), 'app/discover/page.tsx'), 'utf8')
  const events = fs.readFileSync(path.join(process.cwd(), 'app/events/page.tsx'), 'utf8')
  const loveRooms = fs.readFileSync(path.join(process.cwd(), 'app/love-rooms/page.tsx'), 'utf8')

  it('connects the community home to real agenda and place routes', () => {
    expect(discover).toContain('Mon cercle · prochain rendez-vous')
    expect(discover).toContain("href='/events'")
    expect(discover).toContain("href='/lieux'")
  })

  it('keeps profile discovery without a promotional desktop rail', () => {
    expect(discover).toContain("id='new-profiles'")
    expect(discover).not.toContain("lg:grid-cols-[minmax(0,1fr)_280px]")
    expect(discover).not.toContain('Expériences officielles Love Hotel')
  })

  it('connects events to rooms, jacuzzi and official booking opportunities', () => {
    expect(events).toContain('Créer une rencontre autour d’un lieu réel')
    expect(events).toContain('Love Room à l’heure')
    expect(events).toContain('Jacuzzi privatif')
    expect(events).toContain('Chambres rideaux ouverts')
    expect(events).toContain('Réserver une Love Room')
  })

  it('turns Love Rooms into opportunities for community events', () => {
    expect(loveRooms).toContain('Sources de rencontres')
    expect(loveRooms).toContain('Créer un apéro jacuzzi')
    expect(loveRooms).toContain('Organiser des rideaux ouverts')
    expect(loveRooms).toContain('À partir de 35 €/h')
  })
})
