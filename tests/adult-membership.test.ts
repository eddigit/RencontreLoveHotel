import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('adult membership policy', () => {
  it('validates the eighteenth birthday without an off-by-one error', async () => {
    const modulePath = 'lib/adult-membership.ts'
    expect(existsSync(modulePath)).toBe(true)
    if (!existsSync(modulePath)) return

    const {
      adultBirthDateLimit,
      validateAdultDateOfBirth
    } = await import('@/lib/adult-membership')

    expect(adultBirthDateLimit('2026-07-13')).toBe('2008-07-13')
    expect(adultBirthDateLimit('2024-02-29')).toBe('2006-02-28')
    expect(validateAdultDateOfBirth('2008-07-13', '2026-07-13')).toEqual({
      ok: true,
      age: 18,
      dateOfBirth: '2008-07-13'
    })
    expect(validateAdultDateOfBirth('2008-07-14', '2026-07-13')).toEqual({
      ok: false,
      error: 'L’accès est strictement réservé aux personnes majeures.'
    })
  })

  it('rejects malformed, future and implausible birth dates', async () => {
    expect(existsSync('lib/adult-membership.ts')).toBe(true)
    if (!existsSync('lib/adult-membership.ts')) return

    const { validateAdultDateOfBirth } = await import('@/lib/adult-membership')

    expect(validateAdultDateOfBirth('31/12/1990', '2026-07-13').ok).toBe(false)
    expect(validateAdultDateOfBirth('2027-01-01', '2026-07-13').ok).toBe(false)
    expect(validateAdultDateOfBirth('1899-12-31', '2026-07-13').ok).toBe(false)
  })

  it('requires birth date, explicit consent and terms throughout the account flow', () => {
    const register = readFileSync('app/register/page.tsx', 'utf8')
    const middleware = readFileSync('middleware.ts', 'utf8')
    const auth = readFileSync('lib/auth.ts', 'utf8')
    const routes = readFileSync('lib/route-access.ts', 'utf8')

    expect(register).toContain("name='dateOfBirth'")
    expect(register).toContain('adultConsent')
    expect(register).toContain('strictement interdit aux mineurs')
    expect(middleware).toContain('token.adultVerified !== true')
    expect(auth).toContain('token.adultVerified')
    expect(routes).toContain("'/age-verification'")
  })

  it('persists a dated legal record and provides a protected verification action', () => {
    const migrationPath = 'migrations/20260713_adult_membership_consent.sql'
    const actionPath = 'actions/adult-membership-actions.ts'
    const pagePath = 'app/age-verification/page.tsx'

    expect(existsSync(migrationPath)).toBe(true)
    expect(existsSync(actionPath)).toBe(true)
    expect(existsSync(pagePath)).toBe(true)
    if (!existsSync(migrationPath) || !existsSync(actionPath)) return

    const migration = readFileSync(migrationPath, 'utf8')
    const schema = readFileSync('schema.sql', 'utf8')
    const action = readFileSync(actionPath, 'utf8')

    expect(migration).toContain('date_of_birth DATE')
    expect(migration).toContain('adult_consent_at TIMESTAMPTZ')
    expect(migration).toContain('adult_verified_at TIMESTAMPTZ')
    expect(migration).toContain('terms_accepted_at TIMESTAMPTZ')
    expect(migration).toContain('CREATE TRIGGER enforce_adult_membership')
    expect(migration).toContain("INTERVAL '18 years'")
    expect(schema).toContain('users_adult_membership_record_check')
    expect(schema).toContain('CREATE TRIGGER enforce_adult_membership')
    expect(action).toContain('requireAuthenticatedUser()')
    expect(action).toContain('validateAdultDateOfBirth')
  })

  it('uses the verified birth date as the single source for profile age', () => {
    const onboarding = readFileSync('components/onboarding-form.tsx', 'utf8')
    const onboardingService = readFileSync('lib/onboarding-service.ts', 'utf8')
    const profilePage = readFileSync('app/profile/page.tsx', 'utf8')
    const profileEditor = readFileSync('components/UserProfileEditor.tsx', 'utf8')

    expect(onboarding).not.toContain('Votre âge')
    expect(onboarding).not.toContain('Date de naissance')
    expect(onboardingService).toContain('u.date_of_birth')
    expect(profilePage).toContain('adult_verified_at IS NOT NULL')
    expect(profileEditor).toContain('Date de naissance vérifiée')
  })
})
