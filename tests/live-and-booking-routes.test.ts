import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('historical links', () => {
  it.each([
    ['app/love-rooms/[id]/page.tsx', '/love-rooms?tab=reserve'],
    ['app/love-rooms/reservation-confirmation/page.tsx', '/love-rooms?tab=reserve'],
    ['app/en-direct/page.tsx', '/discover#community-wall']
  ])('%s directs old bookmarks to an available service', (file, destination) => {
    expect(readFileSync(file, 'utf8')).toContain(`redirect('${destination}')`)
  })
})
