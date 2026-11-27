import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community wall UI', () => {
  it('keeps the composer visible and exposes the insertion point before the feed', () => {
    const source = readFileSync('components/community-wall.tsx', 'utf8')

    expect(source).toContain('betweenComposerAndFeed?: ReactNode')
    expect(source).toContain('currentUserName?: string | null')
    expect(source).toContain('currentUserAvatar?: string | null')
    expect(source).toContain("<form id='wall-composer' onSubmit={handleCreatePost}")
    expect(source).not.toContain('hidden={!composerOpen}')
    expect(source).toContain('min-h-[72px]')
    expect(source).toContain('bg-[#191714]')
    expect(source).toContain('bg-[#24211d]')
    expect(source).toContain('bg-[#d6bc87]')
    expect(source).toContain("{betweenComposerAndFeed && <div className='mt-4'>{betweenComposerAndFeed}</div>}")
  })
})
