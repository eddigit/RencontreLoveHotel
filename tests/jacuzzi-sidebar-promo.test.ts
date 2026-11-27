import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Community agenda entry point', () => {
  const discover = fs.readFileSync(path.join(process.cwd(), 'app/discover/page.tsx'), 'utf8')
  const jacuzziImageUrl = '/apero-jacuzzi-rencontre.jpg'

  it('does not invent a fixed jacuzzi promotion over the real agenda', () => {
    expect(discover).toContain('upcomingEvents.map')
    expect(discover).toContain("href='/events'")
    expect(discover).not.toContain(jacuzziImageUrl)
    expect(discover).not.toContain('Apéro jacuzzi rencontre')
  })
})
