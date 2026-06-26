import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('admin notifications email moderation migration', () => {
  const sql = readFileSync(
    'migrations/20260626_admin_notifications_email_moderation.sql',
    'utf8'
  )

  it('creates email consent and campaign tables', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS email_preferences')
    expect(sql).toContain('campaign_opt_in BOOLEAN NOT NULL DEFAULT FALSE')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS email_suppression_list')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS email_templates')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS email_campaigns')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS email_campaign_recipients')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS email_send_logs')
  })

  it('creates moderation and audit tables', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS moderation_keywords')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS moderation_queue')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS admin_audit_log')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS auth_logs')
  })

  it('extends notifications for priority audience metadata and read timestamps', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS priority')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS audience')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS metadata')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS read_at')
  })
})
