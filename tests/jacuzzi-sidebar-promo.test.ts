import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Jacuzzi meetup sidebar promo', () => {
  const discover = fs.readFileSync(path.join(process.cwd(), 'app/discover/page.tsx'), 'utf8')
  const jacuzziImageUrl = '/apero-jacuzzi-rencontre.jpg'

  it('promotes apero jacuzzi meetups in the experience sidebar', () => {
    expect(discover).toContain('Apéro jacuzzi rencontre')
    expect(discover).toContain('3 couples maximum')
    expect(discover).toContain('Champagne, spa et rencontre en petit comité')
    expect(discover).toContain(jacuzziImageUrl)
    expect(discover).toContain('backgroundImage')
    expect(discover).toMatch(/<img\s+src=\{jacuzziMeetupImageUrl\}/)
    expect(discover).toContain('Créer un apéro jacuzzi')
    expect(discover.indexOf('RIDEAUX OUVERTS')).toBeLessThan(discover.indexOf('Apéro jacuzzi rencontre'))
    expect(discover.indexOf('Apéro jacuzzi rencontre')).toBeLessThan(discover.indexOf('En ligne dans la communauté'))
  })
})
