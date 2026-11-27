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

  it('loads another profile batch immediately with one explicit click', () => {
    const source = readFileSync('app/discover/page.tsx', 'utf8')
    const showAnotherBatch = source.slice(
      source.indexOf('const showAnotherBatch'),
      source.indexOf('const handleSearchChange')
    )

    expect(source).toContain("import { rotateDiscoveryBatchWithPhotoPriority } from '@/lib/discovery-ranking'")
    expect(showAnotherBatch).toContain('rotateDiscoveryBatchWithPhotoPriority(profiles, 1, 12)')
    expect(showAnotherBatch).toContain('setProfiles(nextProfiles)')
    expect(showAnotherBatch).toContain('void recordProfileImpressions')
    expect(showAnotherBatch).not.toContain('await recordProfileImpressions')
    expect(showAnotherBatch).toContain('localBatchNavigationRef.current = nextBatch')
    expect(showAnotherBatch).toContain('writeDiscoverUrlState')
    expect(source).toContain('if (localBatchNavigationRef.current === restoredBatch)')
    expect(source).not.toContain('preparedProfiles')
    expect(source).not.toContain('preparedBatch')
    expect(source).not.toContain('Afficher ces profils')
  })

  it('uses the connected member impression history across devices', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')

    expect(source).toContain('AND pe.user_id = $1')
    expect(source).toContain('AS viewer_impressions_14d')
    expect(source).toContain('profile.viewer_impressions_14d')
  })

  it('selects starred eligible photos, then eligible photos, before limiting the discovery pool', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')
    const discoverQuery = source.slice(
      source.indexOf('const profilesQuery'),
      source.indexOf('const profilesResult')
    )

    expect(discoverQuery).toContain('AS photo_priority')
    expect(discoverQuery).toContain('eligibleMemberPhotoSql')
    expect(discoverQuery).toContain('u.admin_starred_at IS NOT NULL')
    expect(discoverQuery).toContain('photo_priority DESC')
    expect(discoverQuery.indexOf('photo_priority DESC'))
      .toBeLessThan(discoverQuery.indexOf('LIMIT'))
  })

  it('keeps schema changes out of runtime presence checks', () => {
    const source = readFileSync('lib/presence.ts', 'utf8')
    expect(source).not.toContain('ALTER TABLE')
    expect(source).not.toContain('CREATE INDEX')
    expect(source).toContain('information_schema.columns')
  })
})
