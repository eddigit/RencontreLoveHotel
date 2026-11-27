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

  it('shows compatibility batches sized from the available grid and provides a progressive control', () => {
    const source = readFileSync('app/discover/page.tsx', 'utf8')
    expect(source).toContain('DESKTOP_PROFILE_BATCH_SIZE = 18')
    expect(source).toContain('ResizeObserver(updateColumnCount)')
    expect(source).toContain('Math.min(DESKTOP_PROFILE_BATCH_SIZE, profileColumnCount * 2)')
    expect(source).toContain('filteredProfiles.slice(0, visibleProfileCount)')
    expect(source).toContain('Voir plus')
    expect(source).toContain('profileBatch')
  })

  it('appends another profile batch immediately with one explicit click', () => {
    const source = readFileSync('app/discover/page.tsx', 'utf8')
    const showAnotherBatch = source.slice(
      source.indexOf('const showAnotherBatch'),
      source.indexOf('const handleSearchChange')
    )

    expect(source).not.toContain("import { rotateDiscoveryBatchWithPhotoPriority } from '@/lib/discovery-ranking'")
    expect(showAnotherBatch).not.toContain('setProfiles(')
    expect(showAnotherBatch).not.toContain('recordProfileImpressions')
    expect(showAnotherBatch).toContain('localBatchNavigationRef.current = nextBatch')
    expect(showAnotherBatch).toContain('writeDiscoverUrlState')
    expect(source).toContain('if (localBatchNavigationRef.current === restoredBatch)')
    expect(source).not.toContain('preparedProfiles')
    expect(source).not.toContain('preparedBatch')
    expect(source).not.toContain('Afficher ces profils')
  })

  it('uses only calculated compatibility and records exactly the visible batch', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')
    const actions = readFileSync('actions/user-actions.ts', 'utf8')

    expect(page).toContain('Number(profile.matchScore) > 0')
    expect(page).toContain('return Number(right.matchScore) - Number(left.matchScore)')
    expect(page).toContain('profileBatch * profileBatchSize')
    expect(page).toContain('currentBatch.map(profile => profile.id)')
    expect(actions).toContain('.slice(0, 18)')
    expect(page).toContain('Ajuster mes préférences de matching')
  })

  it('uses the connected member impression history across devices', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')

    expect(source).toContain('AND pe.user_id = $1')
    expect(source).toContain('AS viewer_impressions_14d')
    expect(source).toContain('profile.viewer_impressions_14d')
  })

  it('selects moderator spotlights, existing favorites, then eligible photos before limiting the discovery pool', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')
    const discoverQuery = source.slice(
      source.indexOf('const profilesQuery'),
      source.indexOf('const profilesResult')
    )

    expect(discoverQuery).toContain('AS photo_priority')
    expect(discoverQuery).toContain('eligibleMemberPhotoSql')
    expect(discoverQuery).toContain('u.moderator_spotlight_at IS NOT NULL THEN 3')
    expect(discoverQuery).toContain('u.admin_starred_at IS NOT NULL THEN 2')
    expect(discoverQuery).toContain('photo_priority DESC')
    expect(discoverQuery.indexOf('photo_priority DESC'))
      .toBeLessThan(discoverQuery.indexOf('LIMIT'))
  })

  it('uses one base ranking then rotates it by URL batch, so reloading does not change a visible batch', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')
    const ranking = source.slice(
      source.indexOf('const rankedProfiles = rankDiscoveryCandidates'),
      source.indexOf("const result = {")
    )

    expect(ranking).toContain('batch: 0')
    expect(ranking).toContain('rotateDiscoveryBatchWithPhotoPriority(rankedProfiles, safeBatch, 12)')
  })

  it('keeps schema changes out of runtime presence checks', () => {
    const source = readFileSync('lib/presence.ts', 'utf8')
    expect(source).not.toContain('ALTER TABLE')
    expect(source).not.toContain('CREATE INDEX')
    expect(source).toContain('information_schema.columns')
  })
})
