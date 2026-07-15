import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community feedback support flow', () => {
  it('persists feedback with an admin conversation and explicit email consent', () => {
    const sql = readFileSync('migrations/20260710_v3_feedback_support.sql', 'utf8')

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS community_feedback')
    expect(sql).toContain('conversation_id UUID')
    expect(sql).toContain('request_email_reply BOOLEAN NOT NULL DEFAULT FALSE')
    expect(sql).toContain("status IN ('open', 'in_progress', 'resolved')")
    expect(sql).toContain('ON DELETE SET NULL')
    expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM community_feedback/i)
  })

  it('protects support reads and replies with the admin guard', () => {
    const action = readFileSync('actions/community-feedback-actions.ts', 'utf8')

    expect(action).toContain('requireCurrentUser')
    expect(action).toContain('requireAdmin')
    expect(action).toContain('getCommunityFeedback')
    expect(action).toContain('replyToCommunityFeedback')
    expect(action).toContain('request_email_reply')
    expect(action).toContain('sendMessage')
  })

  it('exposes the feedback inbox in the admin navigation', () => {
    const tabs = readFileSync('components/admin-tabs.tsx', 'utf8')
    const page = readFileSync('app/admin/feedback/page.tsx', 'utf8')

    expect(tabs).toContain("href: '/admin/feedback'")
    expect(tabs).toContain("label: 'Support membres'")
    expect(page).toContain("<ProtectedRoute allowedRoles={['admin']}>")
    expect(page).toContain('getCommunityFeedback')
    expect(page).toContain('replyToCommunityFeedback')
    expect(page).toContain('Support membres')
    expect(page).toContain('Répondre dans la messagerie')
    expect(page).toContain("setActiveStatus('open')")
    expect(page).toContain("setActiveStatus('in_progress')")
    expect(page).toContain("setActiveStatus('resolved')")
  })
})
