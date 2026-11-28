import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PRIVATE_ALBUM_MAX_INPUT_BYTES, PRIVATE_ALBUM_MAX_OUTPUT_BYTES, parsePrivateAlbumAudience, publicPrivateAlbumPhoto } from '@/lib/private-album'

describe('private album contract', () => {
  it('only accepts the two deliberate audiences and keeps media behind an application route', () => {
    expect(parsePrivateAlbumAudience('members')).toBe('members')
    expect(parsePrivateAlbumAudience('private')).toBe('private')
    expect(parsePrivateAlbumAudience('public')).toBeNull()
    expect(publicPrivateAlbumPhoto({ id: 'abc', audience: 'private', mime_type: 'image/webp', width: 1, height: 1, created_at: new Date(0) }).contentUrl).toBe('/api/private-album/photos/abc/content')
  })

  it('uses Vercel-safe bounded media and DB-only private storage', () => {
    expect(PRIVATE_ALBUM_MAX_INPUT_BYTES).toBe(4 * 1024 * 1024)
    expect(PRIVATE_ALBUM_MAX_OUTPUT_BYTES).toBe(3 * 1024 * 1024)
    const migration = readFileSync('migrations/20261128_private_album.sql', 'utf8')
    expect(migration).toContain('BYTEA NOT NULL')
    expect(migration).toContain("'members', 'private'")
    expect(migration).not.toContain('blob.vercel')
  })
})
