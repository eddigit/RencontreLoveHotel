import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community wall migration', () => {
  const sql = readFileSync('migrations/20260710_community_wall.sql', 'utf8')

  it('creates wall post, comment and report tables', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS wall_posts')
    expect(sql).toContain("type IN ('profil', 'evenement', 'dispo_rideaux_ouverts')")
    expect(sql).toContain('char_length(body) BETWEEN 1 AND 500')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS wall_comments')
    expect(sql).toContain('char_length(body) BETWEEN 1 AND 300')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS wall_reports')
    expect(sql).toContain('UNIQUE (target_type, target_id, reporter_id)')
  })

  it('adds feed and moderation indexes', () => {
    expect(sql).toContain('idx_wall_posts_feed')
    expect(sql).toContain('idx_wall_posts_user_created')
    expect(sql).toContain('idx_wall_comments_post_created')
    expect(sql).toContain('idx_wall_reports_target')
  })

  it('extends moderation queue source types for wall content', () => {
    expect(sql).toContain('moderation_queue_source_type_check')
    expect(sql).toContain("'wall_post'")
    expect(sql).toContain("'wall_comment'")
  })
})
