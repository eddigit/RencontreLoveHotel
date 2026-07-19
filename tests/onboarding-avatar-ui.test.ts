import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('onboarding avatar and relationship preferences', () => {
  const form = readFileSync('components/onboarding-form.tsx', 'utf8')
  const avatarStep = readFileSync('components/onboarding-avatar-step.tsx', 'utf8')
  const page = readFileSync('app/onboarding/page.tsx', 'utf8')

  it('recommends a personal avatar without making it mandatory', () => {
    expect(form).toContain('OnboardingAvatarStep')
    expect(avatarStep).toContain('Continuer avec l’avatar proposé')
    expect(form).toContain('totalSteps = 5')
    expect(form).toContain('if (step === 2) return true')
    expect(avatarStep).toContain('Taille maximale : 8 Mo')
  })

  it('collects explicit relationship and BDSM choices', () => {
    expect(form).toContain('seekingProfileTypes')
    expect(form).toContain('relationshipIntents')
    expect(form).toContain('bdsmRoles')
    expect(form).toContain("toggleArrayValue('bdsmRoles', 'none')")
  })

  it('saves onboarding only once from the page', () => {
    expect(form).not.toContain('await saveUserPreferences(user.id, formData)')
    expect(page).not.toContain('new Promise(resolve => setTimeout')
    expect(page.match(/saveUserPreferences/g)?.length).toBe(2)
  })
})
