import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member profile desires', () => {
  const types = readFileSync('lib/member-profile-types.ts', 'utf8')
  const onboarding = readFileSync('components/onboarding-form.tsx', 'utf8')
  const editor = readFileSync('components/UserProfileEditor.tsx', 'utf8')
  const profilePage = readFileSync('app/profile/page.tsx', 'utf8')
  const actions = readFileSync('actions/user-actions.ts', 'utf8')
  const consentMigration = readFileSync('migrations/20261128_bdsm_roles_public.sql', 'utf8')
  const intentsMigration = readFileSync('migrations/20261128_relationship_intents_classic_discreet.sql', 'utf8')

  it('shares the controlled intent and BDSM option definitions with both forms', () => {
    expect(types).toContain("{ value: 'classic', label: 'Relation classique' }")
    expect(types).toContain("{ value: 'discreet', label: 'Rencontre discrète' }")
    expect(types).toContain('export const bdsmRoleOptions')
    for (const value of ['discovery', 'dominant', 'submissive', 'switch', 'none']) {
      expect(types).toContain(`value: '${value}'`)
    }
    expect(onboarding).toContain('relationshipIntentOptions')
    expect(onboarding).toContain('bdsmRoleOptions')
    expect(editor).toContain('relationshipIntentOptions')
    expect(editor).toContain('bdsmRoleOptions')
    expect(onboarding).toContain("DesireIcon value={value}")
    expect(editor).toContain('DesireIcon value={option.value}')
  })

  it('keeps BDSM roles private unless explicit publication consent is saved', () => {
    expect(onboarding).toContain('bdsmRolesPublic: false')
    expect(onboarding).toContain('Afficher mes affinités BDSM sur ma fiche publique')
    expect(editor).toContain('bdsmRolesPublic: user.bdsmRolesPublic === true')
    expect(profilePage).toContain('bdsm_roles_public = COALESCE(${bdsmRolesPublic}::boolean, bdsm_roles_public)')
    expect(actions).toContain("CASE WHEN ${privateAccess || forMatching} OR up.bdsm_roles_public IS TRUE THEN up.bdsm_roles ELSE '{}'::text[] END AS bdsm_roles")
    expect(consentMigration).toContain('ADD COLUMN IF NOT EXISTS bdsm_roles_public BOOLEAN NOT NULL DEFAULT FALSE')
  })

  it('migrates the existing relationship intent check transactionally and idempotently', () => {
    expect(intentsMigration).toContain('BEGIN;')
    expect(intentsMigration).toContain('DROP CONSTRAINT IF EXISTS user_profiles_relationship_intents_check')
    expect(intentsMigration).toContain("ARRAY['classic', 'serious', 'regular', 'casual', 'libertine', 'friendship', 'discreet']::text[]")
    expect(intentsMigration).toContain('COMMIT;')
  })

})
