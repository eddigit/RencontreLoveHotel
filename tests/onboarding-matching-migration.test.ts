import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('onboarding matching preferences migration', () => {
  const sql = readFileSync('migrations/20260719_onboarding_matching_preferences.sql', 'utf8')

  it('adds the optional couple composition and controlled relationship arrays', () => {
    expect(sql).toContain('couple_composition TEXT')
    expect(sql).toContain('seeking_profile_types TEXT[]')
    expect(sql).toContain('relationship_intents TEXT[]')
    expect(sql).toContain('bdsm_roles TEXT[]')
    expect(sql).toContain("ARRAY['male', 'female', 'couple']::text[]")
    expect(sql).toContain("ARRAY['serious', 'regular', 'casual', 'libertine', 'friendship']::text[]")
    expect(sql).toContain("ARRAY['discovery', 'dominant', 'submissive', 'switch', 'none']::text[]")
  })

  it('keeps legacy profiles permissive and makes the BDSM none value exclusive', () => {
    expect(sql).toContain("DEFAULT '{}'::text[]")
    expect(sql).toContain("NOT ('none' = ANY(bdsm_roles) AND CARDINALITY(bdsm_roles) > 1)")
    expect(sql).not.toMatch(/UPDATE\s+user_profiles/i)
  })
})
