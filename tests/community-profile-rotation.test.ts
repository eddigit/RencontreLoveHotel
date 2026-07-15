import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community profile rotation', () => {
  it('removes popularity feedback and excludes existing relationships and blocks', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')
    expect(source).toContain('NOT EXISTS (SELECT 1 FROM user_blocks')
    expect(source).toContain("um_existing.status IN ('accepted', 'pending')")
    expect(source).not.toContain('match_count DESC')
    expect(source).toContain('recordProfileImpressions')
  })

  it('shows twelve profiles and provides another batch control', () => {
    const source = readFileSync('app/discover/page.tsx', 'utf8')
    expect(source).toContain('.slice(0, 12)')
    expect(source).toContain('Découvrir d’autres profils')
    expect(source).toContain('profileBatch')
  })

  it('keeps schema changes out of runtime presence checks', () => {
    const source = readFileSync('lib/presence.ts', 'utf8')
    expect(source).not.toContain('ALTER TABLE')
    expect(source).not.toContain('CREATE INDEX')
    expect(source).toContain('information_schema.columns')
  })
})
