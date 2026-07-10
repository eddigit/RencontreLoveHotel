import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community wall image migration', () => {
  const sql = readFileSync('migrations/20260710_wall_post_images.sql', 'utf8')

  it('adds one optional validated image to wall posts', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS image_url')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS image_mime_type')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS image_size_bytes')
    expect(sql).toContain("image_mime_type IN ('image/jpeg', 'image/png', 'image/webp')")
  })

  it('allows image-only posts while still preventing empty announcements', () => {
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS wall_posts_body_length_check')
    expect(sql).toContain('wall_posts_body_or_image_check')
    expect(sql).toContain('image_url IS NOT NULL')
  })
})
