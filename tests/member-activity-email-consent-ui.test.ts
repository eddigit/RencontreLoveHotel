import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('member activity email consent surfaces', () => {
  it('asks for optional, unchecked consent during credential registration', () => {
    const page = read('app/register/page.tsx')
    const actions = read('app/actions.ts')
    const users = read('lib/user-service.ts')

    expect(page).toContain('activityEmailConsent: false')
    expect(page).toContain("id='activity-email-consent'")
    expect(page).toContain('Recevoir par e-mail les nouveaux messages, matchs et événements')
    expect(page).toContain('formData.activityEmailConsent')
    expect(actions).toContain('activityEmailConsent = false')
    expect(actions).toContain('const user = await createUser(')
    expect(actions).toContain('activityEmailConsent === true')
    expect(users).toContain('activityEmailConsent = false')
    expect(users).toContain('activity_email_decided_at')
  })

  it('mounts a one-time connected-member decision prompt', () => {
    const prompt = read('components/activity-email-consent-prompt.tsx')
    const providers = read('components/providers.tsx')

    expect(providers).toContain('<ActivityEmailConsentPrompt />')
    expect(prompt).toContain('getActivityEmailPreference')
    expect(prompt).toContain('preference.decisionRequired')
    expect(prompt).toContain('Autoriser les e-mails')
    expect(prompt).toContain('Non merci')
    expect(prompt).toContain('Personnaliser')
    expect(prompt).toContain("source: 'login_prompt'")
  })

  it('never opens the connected-member prompt on a public route', () => {
    const prompt = read('components/activity-email-consent-prompt.tsx')

    expect(prompt).toContain("import { usePathname } from 'next/navigation'")
    expect(prompt).toContain("import { isProtectedPagePath } from '@/lib/route-access'")
    expect(prompt).toContain('const isMemberArea = isProtectedPagePath(pathname)')
    expect(prompt).toContain('if (!user?.id || !isMemberArea)')
    expect(prompt).toContain('[user?.id, isMemberArea]')
  })

  it('offers a master switch and three independent activity categories', () => {
    const form = read('components/activity-email-preferences-form.tsx')
    const page = read('app/email-preferences/page.tsx')

    expect(form).toContain('Notifications d’activité par e-mail')
    expect(form).toContain('Nouveaux messages')
    expect(form).toContain('Demandes et confirmations de match')
    expect(form).toContain('Activité de mes événements')
    expect(form).toContain('updateActivityEmailPreference')
    expect(page).toContain('<ActivityEmailPreferencesForm')
    expect(page).toContain('Recevoir les actualités')
    expect(page).toContain('Ne plus recevoir ces emails')
  })
})
