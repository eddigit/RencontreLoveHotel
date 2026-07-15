import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community feedback widget', () => {
  it('adds a bug and suggestion widget to the community home', () => {
    const discoverPage = readFileSync('app/discover/page.tsx', 'utf8')
    const widget = readFileSync('components/community-feedback-widget.tsx', 'utf8')

    expect(discoverPage).toContain('CommunityFeedbackWidget')
    expect(widget).toContain('Signaler un bug')
    expect(widget).toContain('Proposer une amélioration')
    expect(widget).toContain('submitCommunityFeedback')
  })

  it('routes feedback to the pilot profile and email address', () => {
    const action = readFileSync('actions/community-feedback-actions.ts', 'utf8')
    const config = readFileSync('lib/community-feedback-config.ts', 'utf8')

    expect(config).toContain('OPERATIONAL_CONTACT_EMAIL')
    expect(action).toContain("@/lib/community-feedback-config")
    expect(action).toContain('getUserByEmail(FEEDBACK_RECIPIENT_EMAIL)')
    expect(action).toContain('createAppNotification')
    expect(action).toContain('sendMail')
  })
})
