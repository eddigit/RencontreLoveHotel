import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const expectedImageHash = 'df6d1b2751eb28ee9b25d5b179c1b7e602a24461aa30f4f8b805b6fa39a435a3'

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

describe('Rideaux Ouverts visual', () => {
  it('uses the approved visual on the home page and event cards', () => {
    const landing = readFileSync('app/landing-page.tsx', 'utf8')
    const eventPresentation = readFileSync('lib/event-presentation.ts', 'utf8')

    expect(landing).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(eventPresentation).toContain('/images/events/rideaux-ouverts-rencontre.jpg')
    expect(sha256('public/rideaux-ouverts-rencontre.jpg')).toBe(expectedImageHash)
    expect(sha256('public/images/events/rideaux-ouverts-rencontre.jpg')).toBe(expectedImageHash)
  })
})
