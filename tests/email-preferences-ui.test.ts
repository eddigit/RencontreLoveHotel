import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('member email preferences UI', () => {
  it('makes the authenticated member settings reachable from the own profile', () => {
    const profile = read('app/profile/page.tsx')

    expect(profile).toContain("import { getOwnEmailPreferences, updateOwnEmailPreferences } from '@/actions/email-preference-actions'")
    expect(profile).toContain('const emailPreferences = await getOwnEmailPreferences()')
    expect(profile).toContain("<TabsTrigger value='emails'")
    expect(profile).toContain('Préférences e-mail')
    expect(profile).toContain('onSave={updateOwnEmailPreferences}')
    expect(profile).toContain("requestedTab === 'emails'")
  })

  it('uses accessible controls for campaign and scoped activity categories', () => {
    const editor = read('components/email-preferences-editor.tsx')

    expect(editor).toContain("id='campaign-opt-in'")
    expect(editor).toContain("htmlFor='campaign-opt-in'")
    expect(editor).toContain("id='activity-email-consent'")
    expect(editor).toContain("htmlFor='activity-email-consent'")
    expect(editor).toContain("<fieldset disabled={!form.activityEmailConsent}")
    expect(editor).toContain("role='status'")
    expect(editor).toContain("role='alert'")
  })

  it('saves the complete preference state and clears activity categories in the UI when consent is removed', () => {
    const editor = read('components/email-preferences-editor.tsx')

    expect(editor).toContain('await onSave(form)')
    expect(editor).toContain('messageEmailEnabled: false')
    expect(editor).toContain('matchEmailEnabled: false')
    expect(editor).toContain('eventEmailEnabled: false')
  })
})
