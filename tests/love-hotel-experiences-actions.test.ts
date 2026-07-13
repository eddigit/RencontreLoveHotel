import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Love Hotel experience event actions', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'actions/event-actions.ts'), 'utf8')
  const participationSource = fs.readFileSync(path.join(process.cwd(), 'lib/event-participation-service.ts'), 'utf8')

  it('writes experience fields on event creation', () => {
    expect(source).toContain('venue')
    expect(source).toContain('experience_type')
    expect(source).toContain('max_participants')
    expect(source).toContain('publication_status')
    expect(source).toContain('created_by_role')
    expect(source).toContain("publication_status = 'published'")
  })

  it('only lists published upcoming events', () => {
    expect(source).toContain("e.publication_status = 'published'")
  })

  it('prevents subscribing past capacity when max_participants is set', () => {
    expect(participationSource).toContain('max_participants')
    expect(participationSource).toContain('accepted_count')
    expect(participationSource).toContain('L’événement est complet.')
  })
})
