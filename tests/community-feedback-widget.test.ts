import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community feedback widget', () => {
  it('adds an accessible private idea box to the community home', () => {
    const discoverPage = readFileSync('app/discover/page.tsx', 'utf8')
    const widget = readFileSync('components/community-feedback-widget.tsx', 'utf8')

    expect(discoverPage).toContain('CommunityFeedbackWidget')
    expect(widget).toContain('Boîte à idées')
    expect(widget).toContain('Étapes pour reproduire')
    expect(widget).toContain('Résultat attendu')
    expect(widget).toContain('Résultat observé')
    expect(widget).toContain('window.location.pathname')
    expect(widget).toContain('NEXT_PUBLIC_BUILD_VERSION')
    expect(widget).toContain('Signaler un bug')
    expect(widget).toContain('Proposer une idée')
    expect(widget).toContain("initialKind = 'suggestion'")
    expect(widget).toContain("type='radio'")
    expect(widget).toContain("name='community-feedback-kind'")
    expect(widget).toContain("aria-live='polite'")
    expect(widget).toContain('uniquement par l’équipe du site')
    expect(widget).toContain('Votre retour a bien été enregistré. L’équipe le traitera.')
    expect(widget).toContain('} catch {')
    expect(widget).toContain('} finally {')
    expect(discoverPage).toContain("href='#boite-a-idees'")
    expect(discoverPage).toContain("id='boite-a-idees'")
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

  it('keeps the bug shortcut available from the shared member navigation', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const adminPage = readFileSync('app/admin/idees/page.tsx', 'utf8')
    const statusControl = readFileSync('app/admin/idees/status-control.tsx', 'utf8')

    expect(shell).toContain('feedback=bug&from=')
    expect(shell).toContain("label: 'Signaler un bug'")
    expect(shell).toContain('anonymizeFeedbackPath')
    expect(readFileSync('app/discover/page.tsx', 'utf8')).toContain("searchParams.get('feedback') === 'bug'")
    expect(readFileSync('app/discover/page.tsx', 'utf8')).toContain('initialKind={feedbackKind}')
    expect(adminPage).toContain('openBugCount')
    expect(statusControl).toContain('Résolution confirmée')
    expect(statusControl).toContain('Confirmer la résolution')
  })
})
