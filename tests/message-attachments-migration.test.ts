import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('message attachments migration', () => {
  it('creates a dedicated attachment table for image audio and video messages', () => {
    const sql = readFileSync(
      'migrations/20260610_add_message_attachments.sql',
      'utf8'
    )

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS message_attachments')
    expect(sql).toContain("media_type IN ('image', 'audio', 'video')")
    expect(sql).toContain('message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE')
    expect(sql).toContain('url TEXT NOT NULL')
    expect(sql).toContain('size_bytes BIGINT NOT NULL')
    expect(sql).toContain('idx_message_attachments_message_id')
  })
})
